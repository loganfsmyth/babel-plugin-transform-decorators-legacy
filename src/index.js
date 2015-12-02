import template from 'babel-template';

const buildClassDecorator = template(`
  DECORATOR(CLASS_REF = INNER) || CLASS_REF;
`);

const buildPropertyDecorator = template(`
  DESC = (DECORATOR(TARGET, PROPERTY, DESC = INNER) || DESC);
`);

const buildClassPrototype = template(`
  CLASS_REF.prototype;
`);

const buildGetDescriptor = template(`
    Object.getOwnPropertyDescriptor(TARGET, PROPERTY);
`);

const buildSetDescriptor = template(`
    DESC ? Object.defineProperty(TARGET, PROPERTY, DESC) : undefined;
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
    (DESC.value = DESC.initializer ? DESC.initializer.call(TARGET) : undefined) &&
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


export default function({types: t}){

    /**
     * Given a class expression with class-level decorators, create a new expression
     * with the proper decorated behavior.
     */
    function applyClassDecorators(classPath){
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
    function applyMethodDecorators(classPath){
        const hasMethodDecorators = classPath.node.body.body.some(function(node){
            return (node.decorators || []).length > 0;
        });

        if (!hasMethodDecorators) return;

        const name = classPath.scope.generateDeclaredUidIdentifier('class');

        const target = buildClassPrototype({
            CLASS_REF: name,
        }).expression;

        return t.sequenceExpression([
            t.assignmentExpression('=', name, classPath.node),
            applyTargetDecorators(classPath, name, target, classPath.node.body.body),
            name,
        ]);
    }

    /**
     * Given an object expression with property decorators, create a new expression
     * with the proper decorated behavior.
     */
    function applyObjectDecorators(path){
        const hasMethodDecorators = path.node.properties.some(function(node){
            return (node.decorators || []).length > 0;
        });

        if (!hasMethodDecorators) return;

        const name = path.scope.generateDeclaredUidIdentifier('obj');

        return t.sequenceExpression([
            t.assignmentExpression('=', name, path.node),
            applyTargetDecorators(path, name, name, path.node.properties),
            name,
        ]);
    }

    /**
     * A helper to pull out property decorators into a sequence expression.
     */
    function applyTargetDecorators(path, name, target, decoratedProps){
        const descName = path.scope.generateDeclaredUidIdentifier('desc');
        const valueTemp = path.scope.generateDeclaredUidIdentifier('value');

        return t.sequenceExpression(decoratedProps.reduce(function(acc, node){
            const decorators = node.decorators || [];
            node.decorators = null;

            if (decorators.length === 0) return acc;

            const property = t.stringLiteral(node.key.name);


            if (t.isObjectProperty(node)){
                const init = path.scope.generateDeclaredUidIdentifier('init');

                return acc.concat(
                    decorators
                        .map(dec => dec.expression)
                        .reverse()
                        .reduce(function(descriptor, expr){
                            return buildPropertyDecorator({
                                TARGET: target,
                                DECORATOR: expr,
                                DESC: descName,
                                INNER: descriptor,
                                PROPERTY: property,
                            }).expression;
                        }, buildGetObjectInitializer({
                            TEMP: init,
                            TARGET: target,
                            PROPERTY: property
                        }).expression),
                    buildSetObjectInitializer({
                        TARGET: target,
                        PROPERTY: property,
                        DESC: descName,
                    }).expression
                );
            } else if (t.isClassProperty(node)){
                let init = path.scope.generateDeclaredUidIdentifier('init');
                let oldInitializer;
                if (node.value){
                    oldInitializer = node.value;

                    acc.push(t.assignmentExpression('=', init, t.functionExpression(null, [], t.blockStatement([
                        t.returnStatement(oldInitializer),
                    ]))));
                }
                node.value = t.callExpression(t.memberExpression(init, t.identifier('apply')), [t.thisExpression()]);

                return acc.concat(
                    decorators
                        .map(dec => dec.expression)
                        .reverse()
                        .reduce(function(descriptor, expr){
                            return buildPropertyDecorator({
                                TARGET: target,
                                DECORATOR: expr,
                                DESC: descName,
                                INNER: descriptor,
                                PROPERTY: property,
                            }).expression;
                        }, buildGetClassInitializer({
                            INIT: oldInitializer ? init : t.nullLiteral(),
                        }).expression),
                    buildSetClassInitializer({
                        INIT: init,
                        DESC: descName,
                    }).expression
                );
            } else {
                return acc.concat(
                    decorators
                        .map(dec => dec.expression)
                        .reverse()
                        .reduce(function(descriptor, expr){
                            return buildPropertyDecorator({
                                TARGET: target,
                                DECORATOR: expr,
                                DESC: descName,
                                INNER: descriptor,
                                PROPERTY: property,
                            }).expression;
                        }, buildGetDescriptor({
                            TARGET: target,
                            PROPERTY: property,
                        }).expression),
                    buildSetDescriptor({
                        TARGET: target,
                        PROPERTY: property,
                        DESC: descName,
                    }).expression
                );
            }
        }, []))
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
            ClassExpression(path){
                // Create a replacement for the class node if there is one. We do one pass to replace classes with
                // class decorators, and a second pass to process method decorators.
                const decoratedClass = applyClassDecorators(path) || applyMethodDecorators(path);

                if (decoratedClass) path.replaceWith(decoratedClass);
            },
            ObjectExpression(path){
                const decoratedObject = applyObjectDecorators(path);

                if (decoratedObject) path.replaceWith(decoratedObject);
            },
        }
    };
};
