import template from 'babel-template';

const buildClassDecorator = template(`
  DECORATOR(CLASS_REF = INNER) || CLASS_REF;
`);

const buildPropertyDecorator = template(`
  DESC = DECORATOR(TARGET, PROPERTY, INNER) || DESC;
`);

const buildClassPrototype = template(`
  CLASS_REF.prototype;
`);

const buildGetDescriptor = template(`
    Object.getOwnPropertyDescriptor(TARGET, PROPERTY);
`);

const buildSetDescriptor = template(`
    DESC ? Object.defineProperty(TARGET, PROPERTY, DESC) : void 0;
`);

const buildGetObjectInitializer = template(`
    (TEMP = Object.getOwnPropertyDescriptor(TARGET, PROPERTY).value, {
        enumerable: true,
        configurable: true,
        writable: true,
        initializer: function(){
            return TEMP;
        }
    })
`);

const buildSetObjectInitializer = template(`
    (DESC.value = DESC.initializer ? DESC.initializer.call(TARGET) : void 0) &&
        Object.defineProperty(TARGET, PROPERTY, DESC);
`);

const buildGetClassInitializer = template(`
    ({
        enumerable: true,
        configurable: true,
        writable: true,
        initializer: INIT,
    })
`);

const buildSetClassInitializer = template(`
    INIT = DESC.initializer;
`);

const buildClassInitializerCall = template(`
    INIT ? INIT.apply(this) : void 0;
`);

export default function({types: t}){

    /**
     * If the decorator expressions are non-identifiers, hoist them to before the class so we can be sure
     * that they are evaluated in order.
     */
    function applyEnsureOrdering(path){
        // TODO: This should probably also hoist computed properties.
        const decorators = (path.isClass() ? [path].concat(path.get('body.body')) : path.get('properties'))
                .reduce((acc, prop) => acc.concat(prop.node.decorators || []), []);

        const identDecorators = decorators.filter(decorator => !t.isIdentifier(decorator.expression));
        if (identDecorators.length === 0) return;

        return t.sequenceExpression(identDecorators.map(decorator => {
            const expression = decorator.expression;
            const id = decorator.expression = path.scope.generateDeclaredUidIdentifier('dec');
            return t.assignmentExpression('=', id, expression);
        }).concat([path.node]));
    }

    /**
     * Given a class expression with class-level decorators, create a new expression
     * with the proper decorated behavior.
     */
    function applyClassDecorators(classPath, state){
        const decorators = classPath.node.decorators || [];
        classPath.node.decorators = null;

        if (decorators.length === 0) return;

        const name = classPath.scope.generateDeclaredUidIdentifier('class');

        return decorators
            .map(dec => dec.expression)
            .reverse()
            .reduce(function(acc, decorator){
                return buildClassDecorator({
                    CLASS_REF: name,
                    DECORATOR: decorator,
                    INNER: acc,
                }).expression;
            }, classPath.node);
    }

    /**
     * Given a class expression with method-level decorators, create a new expression
     * with the proper decorated behavior.
     */
    function applyMethodDecorators(path, state){
        const hasMethodDecorators = path.node.body.body.some(function(node){
            return (node.decorators || []).length > 0;
        });

        if (!hasMethodDecorators) return;

        return applyTargetDecorators(path, state, path.node.body.body);
    }

    /**
     * Given an object expression with property decorators, create a new expression
     * with the proper decorated behavior.
     */
    function applyObjectDecorators(path, state){
        const hasMethodDecorators = path.node.properties.some(function(node){
            return (node.decorators || []).length > 0;
        });

        if (!hasMethodDecorators) return;

        return applyTargetDecorators(path, state, path.node.properties);
    }

    /**
     * A helper to pull out property decorators into a sequence expression.
     */
    function applyTargetDecorators(path, state, decoratedProps){
        const descName = path.scope.generateDeclaredUidIdentifier('desc');
        const valueTemp = path.scope.generateDeclaredUidIdentifier('value');

        const name = path.scope.generateDeclaredUidIdentifier(path.isClass() ? 'class' : 'obj');

        const exprs = decoratedProps.reduce(function(acc, node){
            const decorators = node.decorators || [];
            node.decorators = null;

            if (decorators.length === 0) return acc;

            if (t.isClassProperty(node, {static: true})){
                throw path.buildCodeFrameError('Static class property decorators are not yet supported.')
            }

            if (node.computed){
                throw path.buildCodeFrameError('Computed method/property decorators are not yet supported.')
            }

            const property = t.isLiteral(node.key) ? node.key : t.stringLiteral(node.key.name);

            const target = (path.isClass() && !node.static) ? buildClassPrototype({
                CLASS_REF: name,
            }).expression : name;

            let buildDecoratorCall = function(descriptor, expr){
                return buildPropertyDecorator({
                    TARGET: target,
                    DECORATOR: expr,
                    DESC: descName,
                    INNER: descriptor,
                    PROPERTY: property,
                }).expression;
            };
            let buildDescriptorCreate;
            let buildDescriptorStore;

            if (t.isObjectProperty(node)){
                // Read value from object and store in temp to be read from initializer.
                buildDescriptorCreate = function(){
                    return buildGetObjectInitializer({
                        TEMP: path.scope.generateDeclaredUidIdentifier('init'),
                        TARGET: target,
                        PROPERTY: property
                    }).expression;
                };

                // Trigger initializer and set descriptor.
                buildDescriptorStore = function(){
                    return buildSetObjectInitializer({
                        TARGET: target,
                        PROPERTY: property,
                        DESC: descName,
                    }).expression;
                };
            } else if (t.isClassProperty(node)){
                let init = path.scope.generateDeclaredUidIdentifier('init');
                let oldInitializer;
                if (node.value){
                    // Move the initializer to a temp variable and reassign to new temp.
                    oldInitializer = node.value;
                    acc.push(t.assignmentExpression('=', init, t.functionExpression(null, [], t.blockStatement([
                        t.returnStatement(oldInitializer),
                    ]))));
                }
                node.value = buildClassInitializerCall({
                    INIT: init,
                }).expression;

                // Create initializer that reads from new temp.
                buildDescriptorCreate = function(){
                    return buildGetClassInitializer({
                        INIT: oldInitializer ? init : t.nullLiteral(),
                    }).expression;
                };

                // Trigger initializer and set descriptor.
                buildDescriptorStore = function(){
                    return buildSetClassInitializer({
                        INIT: init,
                        DESC: descName,
                    }).expression;
                };
            } else {
                // Read descriptor normally.
                buildDescriptorCreate = function(){
                    return buildGetDescriptor({
                        TARGET: target,
                        PROPERTY: property,
                    }).expression;
                };

                // Store descriptor normally.
                buildDescriptorStore = function(){
                    return buildSetDescriptor({
                        TARGET: target,
                        PROPERTY: property,
                        DESC: descName,
                    }).expression;
                };
            }

            return acc.concat(
                decorators
                    .map(dec => dec.expression)
                    .reverse()
                    .reduce(buildDecoratorCall, t.assignmentExpression('=', descName, buildDescriptorCreate())),
                buildDescriptorStore()
            );
        }, []);

        return t.sequenceExpression([
            t.assignmentExpression('=', name, path.node),
            t.sequenceExpression(exprs),
            name,
        ]);
    }

    return {
        inherits: require("babel-plugin-syntax-decorators"),

        visitor: {
            ExportDefaultDeclaration(path){
                if (!path.get("declaration").isClassDeclaration()) return;

                const {node} = path;
                const ref = node.declaration.id || path.scope.generateUidIdentifier("default");
                node.declaration.id = ref;

                // Split the class declaration and the export into two separate statements.
                path.replaceWith(node.declaration);
                path.insertAfter(t.exportNamedDeclaration(null, [t.exportSpecifier(ref, t.identifier('default'))]));
            },
            ClassDeclaration(path){
                const {node} = path;

                const ref = node.id || path.scope.generateUidIdentifier("class");

                path.replaceWith(t.variableDeclaration("let", [
                  t.variableDeclarator(ref, t.toExpression(node))
                ]));
            },
            ClassExpression(path, state){
                // Create a replacement for the class node if there is one. We do one pass to replace classes with
                // class decorators, and a second pass to process method decorators.
                const decoratedClass = applyEnsureOrdering(path) || applyClassDecorators(path, state) || applyMethodDecorators(path, state);

                if (decoratedClass) path.replaceWith(decoratedClass);
            },
            ObjectExpression(path, state){
                const decoratedObject = applyEnsureOrdering(path) || applyObjectDecorators(path, state);

                if (decoratedObject) path.replaceWith(decoratedObject);
            },
        }
    };
};
