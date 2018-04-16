import {expect} from 'chai';

describe('decorators', function(){
    describe('class', function(){
        describe('ordering', function(){
            it('should evaluate descriptor expressions in order', function(){
                const calls = [];
                function dec(id){
                    calls.push(id);
                    return function(){};
                }

                @dec(1)
                @dec(2)
                class Example {
                    @dec(3)
                    @dec(4)
                    method1(){}

                    @dec(5)
                    @dec(6)
                    prop1 = 1;

                    @dec(7)
                    @dec(8)
                    method2(){}

                    @dec(9)
                    @dec(10)
                    prop2 = 2;
                }

                expect(calls).to.eql([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            });

            it('should call decorators in reverse order per-method', function(){
                const calls = [];
                function dec(id){
                    return function(){
                        calls.push(id);
                    };
                }

                @dec(10)
                @dec(9)
                class Example {
                    @dec(2)
                    @dec(1)
                    method1(){}

                    @dec(4)
                    @dec(3)
                    prop1 = 1;

                    @dec(6)
                    @dec(5)
                    method2(){}

                    @dec(8)
                    @dec(7)
                    prop2 = 2;
                }

                expect(calls).to.eql([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            });
        });

        describe('constructors', function(){
            it('should allow returning a new constructor', function(){
                function dec(cls){
                    return class Child extends cls {
                        child(){}
                    };
                }

                @dec
                class Parent {
                    parent(){}
                }

                expect(Parent.prototype.parent).to.be.a('function');
                expect(Parent.prototype.child).to.be.a('function');
            });

            it('should allow mutating the existing constructor', function(){
                function dec(cls){
                    cls.staticProp = 'prop';
                }

                @dec
                class Parent {
                    parent(){}
                }

                expect(Parent.staticProp).to.eql('prop');
            });
        });

        describe('prototype methods', function(){
            it('should support numeric props', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.eql(4);
                    expect(descriptor).to.be.an('object');
                }

                class Example {
                    @dec
                    4(){

                    }
                }
            });

            it('should support string props', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.eql("str");
                    expect(descriptor).to.be.an('object');
                }

                class Example {
                    @dec
                    "str"(){

                    }
                }
            });

            it('should allow returning a descriptor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.be.a('string');
                    expect(descriptor).to.be.an('object');

                    target.decoratedProps = (target.decoratedProps || []).concat([name]);

                    let value = descriptor.value;
                    return {
                        enumerable: name.indexOf('enum') !== -1,
                        configurable: name.indexOf('conf') !== -1,
                        writable: name.indexOf('write') !== -1,
                        value: function(...args){
                            return '__' + value.apply(this, args) + '__';
                        },
                    };
                }

                class Example {
                    @dec
                    enumconfwrite(){
                        return 1;
                    }

                    @dec
                    enumconf(){
                        return 2;
                    }

                    @dec
                    enumwrite(){
                        return 3;
                    }

                    @dec
                    enum(){
                        return 4;
                    }

                    @dec
                    confwrite(){
                        return 5;
                    }

                    @dec
                    conf(){
                        return 6;
                    }

                    @dec
                    write(){
                        return 7;
                    }

                    @dec
                    _(){
                        return 8;
                    }
                }

                expect(Example.prototype).to.have.ownProperty('decoratedProps');
                expect(Example.prototype.decoratedProps).to.eql([
                    "enumconfwrite",
                    "enumconf",
                    "enumwrite",
                    "enum",
                    "confwrite",
                    "conf",
                    "write",
                    "_",
                ]);

                const inst = new Example();

                const descs = Object.getOwnPropertyDescriptors(Example.prototype);
                expect(descs.enumconfwrite.enumerable).to.be.true;
                expect(descs.enumconfwrite.writable).to.be.true;
                expect(descs.enumconfwrite.configurable).to.be.true;
                expect(inst.enumconfwrite()).to.eql('__1__');

                expect(descs.enumconf.enumerable).to.be.true;
                expect(descs.enumconf.writable).to.be.false;
                expect(descs.enumconf.configurable).to.be.true;
                expect(inst.enumconf()).to.eql('__2__');

                expect(descs.enumwrite.enumerable).to.be.true;
                expect(descs.enumwrite.writable).to.be.true;
                expect(descs.enumwrite.configurable).to.be.false;
                expect(inst.enumwrite()).to.eql('__3__');

                expect(descs.enum.enumerable).to.be.true;
                expect(descs.enum.writable).to.be.false;
                expect(descs.enum.configurable).to.be.false;
                expect(inst.enum()).to.eql('__4__');

                expect(descs.confwrite.enumerable).to.be.false;
                expect(descs.confwrite.writable).to.be.true;
                expect(descs.confwrite.configurable).to.be.true;
                expect(inst.confwrite()).to.eql('__5__');

                expect(descs.conf.enumerable).to.be.false;
                expect(descs.conf.writable).to.be.false;
                expect(descs.conf.configurable).to.be.true;
                expect(inst.conf()).to.eql('__6__');

                expect(descs.write.enumerable).to.be.false;
                expect(descs.write.writable).to.be.true;
                expect(descs.write.configurable).to.be.false;
                expect(inst.write()).to.eql('__7__');

                expect(descs._.enumerable).to.be.false;
                expect(descs._.writable).to.be.false;
                expect(descs._.configurable).to.be.false;
                expect(inst._()).to.eql('__8__');
            });

            it('should allow mutating the original descriptor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.be.a('string');
                    expect(descriptor).to.be.an('object');

                    target.decoratedProps = (target.decoratedProps || []).concat([name]);

                    let value = descriptor.value;
                    Object.assign(descriptor, {
                        enumerable: name.indexOf('enum') !== -1,
                        configurable: name.indexOf('conf') !== -1,
                        writable: name.indexOf('write') !== -1,
                        value: function(...args){
                            return '__' + value.apply(this, args) + '__';
                        },
                    });
                }

                class Example {
                    @dec
                    enumconfwrite(){
                        return 1;
                    }

                    @dec
                    enumconf(){
                        return 2;
                    }

                    @dec
                    enumwrite(){
                        return 3;
                    }

                    @dec
                    enum(){
                        return 4;
                    }

                    @dec
                    confwrite(){
                        return 5;
                    }

                    @dec
                    conf(){
                        return 6;
                    }

                    @dec
                    write(){
                        return 7;
                    }

                    @dec
                    _(){
                        return 8;
                    }
                }

                expect(Example.prototype).to.have.ownProperty('decoratedProps');
                expect(Example.prototype.decoratedProps).to.eql([
                    "enumconfwrite",
                    "enumconf",
                    "enumwrite",
                    "enum",
                    "confwrite",
                    "conf",
                    "write",
                    "_",
                ]);

                const inst = new Example();

                const descs = Object.getOwnPropertyDescriptors(Example.prototype);
                expect(descs.enumconfwrite.enumerable).to.be.true;
                expect(descs.enumconfwrite.writable).to.be.true;
                expect(descs.enumconfwrite.configurable).to.be.true;
                expect(inst.enumconfwrite()).to.eql('__1__');

                expect(descs.enumconf.enumerable).to.be.true;
                expect(descs.enumconf.writable).to.be.false;
                expect(descs.enumconf.configurable).to.be.true;
                expect(inst.enumconf()).to.eql('__2__');

                expect(descs.enumwrite.enumerable).to.be.true;
                expect(descs.enumwrite.writable).to.be.true;
                expect(descs.enumwrite.configurable).to.be.false;
                expect(inst.enumwrite()).to.eql('__3__');

                expect(descs.enum.enumerable).to.be.true;
                expect(descs.enum.writable).to.be.false;
                expect(descs.enum.configurable).to.be.false;
                expect(inst.enum()).to.eql('__4__');

                expect(descs.confwrite.enumerable).to.be.false;
                expect(descs.confwrite.writable).to.be.true;
                expect(descs.confwrite.configurable).to.be.true;
                expect(inst.confwrite()).to.eql('__5__');

                expect(descs.conf.enumerable).to.be.false;
                expect(descs.conf.writable).to.be.false;
                expect(descs.conf.configurable).to.be.true;
                expect(inst.conf()).to.eql('__6__');

                expect(descs.write.enumerable).to.be.false;
                expect(descs.write.writable).to.be.true;
                expect(descs.write.configurable).to.be.false;
                expect(inst.write()).to.eql('__7__');

                expect(descs._.enumerable).to.be.false;
                expect(descs._.writable).to.be.false;
                expect(descs._.configurable).to.be.false;
                expect(inst._()).to.eql('__8__');
            });
        });

        describe('static methods', function(){
            it('should support numeric props', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.eql(4);
                    expect(descriptor).to.be.an('object');
                }

                class Example {
                    @dec
                    static 4(){

                    }
                }
            });

            it('should support string props', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.eql("str");
                    expect(descriptor).to.be.an('object');
                }

                class Example {
                    @dec
                    static "str"(){

                    }
                }
            });

            it('should allow returning a descriptor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.be.a('string');
                    expect(descriptor).to.be.an('object');

                    target.decoratedProps = (target.decoratedProps || []).concat([name]);

                    let value = descriptor.value;
                    return {
                        enumerable: name.indexOf('enum') !== -1,
                        configurable: name.indexOf('conf') !== -1,
                        writable: name.indexOf('write') !== -1,
                        value: function(...args){
                            return '__' + value.apply(this, args) + '__';
                        },
                    };
                }

                class Example {
                    @dec
                    static enumconfwrite(){
                        return 1;
                    }

                    @dec
                    static enumconf(){
                        return 2;
                    }

                    @dec
                    static enumwrite(){
                        return 3;
                    }

                    @dec
                    static enum(){
                        return 4;
                    }

                    @dec
                    static confwrite(){
                        return 5;
                    }

                    @dec
                    static conf(){
                        return 6;
                    }

                    @dec
                    static write(){
                        return 7;
                    }

                    @dec
                    static _(){
                        return 8;
                    }
                }

                expect(Example).to.have.ownProperty('decoratedProps');
                expect(Example.decoratedProps).to.eql([
                    "enumconfwrite",
                    "enumconf",
                    "enumwrite",
                    "enum",
                    "confwrite",
                    "conf",
                    "write",
                    "_",
                ]);

                const descs = Object.getOwnPropertyDescriptors(Example);
                expect(descs.enumconfwrite.enumerable).to.be.true;
                expect(descs.enumconfwrite.writable).to.be.true;
                expect(descs.enumconfwrite.configurable).to.be.true;
                expect(Example.enumconfwrite()).to.eql('__1__');

                expect(descs.enumconf.enumerable).to.be.true;
                expect(descs.enumconf.writable).to.be.false;
                expect(descs.enumconf.configurable).to.be.true;
                expect(Example.enumconf()).to.eql('__2__');

                expect(descs.enumwrite.enumerable).to.be.true;
                expect(descs.enumwrite.writable).to.be.true;
                expect(descs.enumwrite.configurable).to.be.false;
                expect(Example.enumwrite()).to.eql('__3__');

                expect(descs.enum.enumerable).to.be.true;
                expect(descs.enum.writable).to.be.false;
                expect(descs.enum.configurable).to.be.false;
                expect(Example.enum()).to.eql('__4__');

                expect(descs.confwrite.enumerable).to.be.false;
                expect(descs.confwrite.writable).to.be.true;
                expect(descs.confwrite.configurable).to.be.true;
                expect(Example.confwrite()).to.eql('__5__');

                expect(descs.conf.enumerable).to.be.false;
                expect(descs.conf.writable).to.be.false;
                expect(descs.conf.configurable).to.be.true;
                expect(Example.conf()).to.eql('__6__');

                expect(descs.write.enumerable).to.be.false;
                expect(descs.write.writable).to.be.true;
                expect(descs.write.configurable).to.be.false;
                expect(Example.write()).to.eql('__7__');

                expect(descs._.enumerable).to.be.false;
                expect(descs._.writable).to.be.false;
                expect(descs._.configurable).to.be.false;
                expect(Example._()).to.eql('__8__');
            });

            it('should allow mutating the original descriptor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.be.a('string');
                    expect(descriptor).to.be.an('object');

                    target.decoratedProps = (target.decoratedProps || []).concat([name]);

                    let value = descriptor.value;
                    Object.assign(descriptor, {
                        enumerable: name.indexOf('enum') !== -1,
                        configurable: name.indexOf('conf') !== -1,
                        writable: name.indexOf('write') !== -1,
                        value: function(...args){
                            return '__' + value.apply(this, args) + '__';
                        },
                    });
                }

                class Example {
                    @dec
                    static enumconfwrite(){
                        return 1;
                    }

                    @dec
                    static enumconf(){
                        return 2;
                    }

                    @dec
                    static enumwrite(){
                        return 3;
                    }

                    @dec
                    static enum(){
                        return 4;
                    }

                    @dec
                    static confwrite(){
                        return 5;
                    }

                    @dec
                    static conf(){
                        return 6;
                    }

                    @dec
                    static write(){
                        return 7;
                    }

                    @dec
                    static _(){
                        return 8;
                    }
                }

                expect(Example).to.have.ownProperty('decoratedProps');
                expect(Example.decoratedProps).to.eql([
                    "enumconfwrite",
                    "enumconf",
                    "enumwrite",
                    "enum",
                    "confwrite",
                    "conf",
                    "write",
                    "_",
                ]);

                const descs = Object.getOwnPropertyDescriptors(Example);
                expect(descs.enumconfwrite.enumerable).to.be.true;
                expect(descs.enumconfwrite.writable).to.be.true;
                expect(descs.enumconfwrite.configurable).to.be.true;
                expect(Example.enumconfwrite()).to.eql('__1__');

                expect(descs.enumconf.enumerable).to.be.true;
                expect(descs.enumconf.writable).to.be.false;
                expect(descs.enumconf.configurable).to.be.true;
                expect(Example.enumconf()).to.eql('__2__');

                expect(descs.enumwrite.enumerable).to.be.true;
                expect(descs.enumwrite.writable).to.be.true;
                expect(descs.enumwrite.configurable).to.be.false;
                expect(Example.enumwrite()).to.eql('__3__');

                expect(descs.enum.enumerable).to.be.true;
                expect(descs.enum.writable).to.be.false;
                expect(descs.enum.configurable).to.be.false;
                expect(Example.enum()).to.eql('__4__');

                expect(descs.confwrite.enumerable).to.be.false;
                expect(descs.confwrite.writable).to.be.true;
                expect(descs.confwrite.configurable).to.be.true;
                expect(Example.confwrite()).to.eql('__5__');

                expect(descs.conf.enumerable).to.be.false;
                expect(descs.conf.writable).to.be.false;
                expect(descs.conf.configurable).to.be.true;
                expect(Example.conf()).to.eql('__6__');

                expect(descs.write.enumerable).to.be.false;
                expect(descs.write.writable).to.be.true;
                expect(descs.write.configurable).to.be.false;
                expect(Example.write()).to.eql('__7__');

                expect(descs._.enumerable).to.be.false;
                expect(descs._.writable).to.be.false;
                expect(descs._.configurable).to.be.false;
                expect(Example._()).to.eql('__8__');
            });
        });

        describe('prototype properties', function(){
            it('should support decorating properties that have no initializer', function(){
                function dec(target, name, descriptor){

                }

                class Example {
                    @dec prop;
                }

                let inst = new Example();
                expect(inst).to.have.ownProperty('prop');
                expect(inst.prop).to.be.undefined;
            });

            it('should support mutating an initialzer into an accessor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.eql("prop");
                    expect(descriptor).to.be.an('object');

                    let {initializer} = descriptor;
                    delete descriptor.initializer;
                    delete descriptor.writable;

                    let value;
                    descriptor.get = function(){
                        if (initializer){
                            value = '__' + initializer.call(this) + '__';
                            initializer = null;
                        }
                        return value;
                    };
                }

                class Example {
                    @dec
                    prop = 3;
                }

                let inst = new Example();

                expect(inst.prop).to.eql('__3__');
            });

            it('should support properties on child classes', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.be.a('string');
                    expect(descriptor).to.be.an('object');

                    target.decoratedProps = (target.decoratedProps || []).concat([name]);

                    let initializer = descriptor.initializer;
                    descriptor.initializer = function(...args){
                        return '__' + initializer.apply(this, args) + '__';
                    };
                }

                class Base {
                    @dec
                    prop2 = 4;
                }

                class Example extends Base {
                    @dec
                    prop = 3;
                }

                let inst = new Example();

                expect(inst.prop).to.eql('__3__');
                expect(inst.prop2).to.eql('__4__');
            });

            it('should allow returning a descriptor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.be.a('string');
                    expect(descriptor).to.be.an('object');

                    target.decoratedProps = (target.decoratedProps || []).concat([name]);

                    let accessorValue;
                    let initializer = descriptor.initializer;
                    let isAccessor = name.indexOf('accessor') !== -1;
                    return Object.assign({
                        enumerable: name.indexOf('enum') !== -1,
                        configurable: name.indexOf('conf') !== -1,
                        initializer: function(...args){
                            return '__' + initializer.apply(this, args) + '__';
                        },
                    }, isAccessor ? {
                        get(){ return accessorValue; },
                        set(value){ accessorValue = value },
                    } : {
                        writable: name.indexOf('write') !== -1,
                    });
                }

                class Example {
                    @dec
                    enumconfwrite = 1;

                    @dec
                    enumconf = 2;

                    @dec
                    enumwrite = 3;

                    @dec
                    enum = 4;

                    @dec
                    confwrite = 5;

                    @dec
                    conf = 6;

                    @dec
                    write = 7;

                    @dec
                    accessor = 8;

                    @dec
                    _ = 9;
                }
                const inst = new Example();

                expect(Example.prototype).to.have.ownProperty('decoratedProps');
                expect(inst.decoratedProps).to.eql([
                    "enumconfwrite",
                    "enumconf",
                    "enumwrite",
                    "enum",
                    "confwrite",
                    "conf",
                    "write",
                    "accessor",
                    "_",
                ]);

                const descs = Object.getOwnPropertyDescriptors(inst);
                expect(descs.enumconfwrite.enumerable).to.be.true;
                expect(descs.enumconfwrite.writable).to.be.true;
                expect(descs.enumconfwrite.configurable).to.be.true;
                expect(inst.enumconfwrite).to.eql('__1__');

                expect(descs.enumconf.enumerable).to.be.true;
                expect(descs.enumconf.writable).to.be.false;
                expect(descs.enumconf.configurable).to.be.true;
                expect(inst.enumconf).to.eql('__2__');

                expect(descs.enumwrite.enumerable).to.be.true;
                expect(descs.enumwrite.writable).to.be.true;
                expect(descs.enumwrite.configurable).to.be.false;
                expect(inst.enumwrite).to.eql('__3__');

                expect(descs.enum.enumerable).to.be.true;
                expect(descs.enum.writable).to.be.false;
                expect(descs.enum.configurable).to.be.false;
                expect(inst.enum).to.eql('__4__');

                expect(descs.confwrite.enumerable).to.be.false;
                expect(descs.confwrite.writable).to.be.true;
                expect(descs.confwrite.configurable).to.be.true;
                expect(inst.confwrite).to.eql('__5__');

                expect(descs.conf.enumerable).to.be.false;
                expect(descs.conf.writable).to.be.false;
                expect(descs.conf.configurable).to.be.true;
                expect(inst.conf).to.eql('__6__');

                expect(descs.write.enumerable).to.be.false;
                expect(descs.write.writable).to.be.true;
                expect(descs.write.configurable).to.be.false;
                expect(inst.write).to.eql('__7__');

                expect(descs.accessor.enumerable).to.be.false;
                expect(descs.accessor.writable).to.be.undefined;
                expect(descs.accessor.configurable).to.be.false;
                expect(descs.accessor.set).to.be.a('function');
                expect(descs.accessor.get).to.be.a('function');
                expect(inst.accessor).to.eql('__8__');

                expect(descs._.enumerable).to.be.false;
                expect(descs._.writable).to.be.false;
                expect(descs._.configurable).to.be.false;
                expect(inst._).to.eql('__9__');
            });

            it('should allow mutating the original descriptor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.be.a('string');
                    expect(descriptor).to.be.an('object');

                    target.decoratedProps = (target.decoratedProps || []).concat([name]);

                    let accessorValue;
                    let initializer = descriptor.initializer;
                    let isAccessor = name.indexOf('accessor') !== -1;
                    Object.assign(descriptor, {
                        enumerable: name.indexOf('enum') !== -1,
                        configurable: name.indexOf('conf') !== -1,
                        writable: name.indexOf('write') !== -1,
                        initializer: function(...args){
                            return '__' + initializer.apply(this, args) + '__';
                        },
                    }, isAccessor && {
                        get(){ return accessorValue; },
                        set(value){ accessorValue = value },
                    });

                    if (isAccessor) {
                        delete descriptor.writable;
                    }
                }

                class Example {
                    @dec
                    enumconfwrite = 1;

                    @dec
                    enumconf = 2;

                    @dec
                    enumwrite = 3;

                    @dec
                    enum = 4;

                    @dec
                    confwrite = 5;

                    @dec
                    conf = 6;

                    @dec
                    write = 7;

                    @dec
                    accessor = 8;

                    @dec
                    _ = 9;
                }
                const inst = new Example();

                expect(Example.prototype).to.have.ownProperty('decoratedProps');
                expect(inst.decoratedProps).to.eql([
                    "enumconfwrite",
                    "enumconf",
                    "enumwrite",
                    "enum",
                    "confwrite",
                    "conf",
                    "write",
                    "accessor",
                    "_",
                ]);

                const descs = Object.getOwnPropertyDescriptors(inst);
                expect(descs.enumconfwrite.enumerable).to.be.true;
                expect(descs.enumconfwrite.writable).to.be.true;
                expect(descs.enumconfwrite.configurable).to.be.true;
                expect(inst.enumconfwrite).to.eql('__1__');

                expect(descs.enumconf.enumerable).to.be.true;
                expect(descs.enumconf.writable).to.be.false;
                expect(descs.enumconf.configurable).to.be.true;
                expect(inst.enumconf).to.eql('__2__');

                expect(descs.enumwrite.enumerable).to.be.true;
                expect(descs.enumwrite.writable).to.be.true;
                expect(descs.enumwrite.configurable).to.be.false;
                expect(inst.enumwrite).to.eql('__3__');

                expect(descs.enum.enumerable).to.be.true;
                expect(descs.enum.writable).to.be.false;
                expect(descs.enum.configurable).to.be.false;
                expect(inst.enum).to.eql('__4__');

                expect(descs.confwrite.enumerable).to.be.false;
                expect(descs.confwrite.writable).to.be.true;
                expect(descs.confwrite.configurable).to.be.true;
                expect(inst.confwrite).to.eql('__5__');

                expect(descs.conf.enumerable).to.be.false;
                expect(descs.conf.writable).to.be.false;
                expect(descs.conf.configurable).to.be.true;
                expect(inst.conf).to.eql('__6__');

                expect(descs.write.enumerable).to.be.false;
                expect(descs.write.writable).to.be.true;
                expect(descs.write.configurable).to.be.false;
                expect(inst.write).to.eql('__7__');

                expect(descs.accessor.enumerable).to.be.false;
                expect(descs.accessor.writable).to.be.undefined;
                expect(descs.accessor.configurable).to.be.false;
                expect(descs.accessor.set).to.be.a('function');
                expect(descs.accessor.get).to.be.a('function');
                expect(inst.accessor).to.eql('__8__');

                expect(descs._.enumerable).to.be.false;
                expect(descs._.writable).to.be.false;
                expect(descs._.configurable).to.be.false;
                expect(inst._).to.eql('__9__');
            });
        });

        describe('static properties', function(){
            it('should support decorating properties that have no initializer', function(){
                function dec(target, name, descriptor){

                }

                class Example {
                    @dec static prop;
                }

                expect(Example).to.have.ownProperty('prop');
                expect(Example.prop).to.be.undefined;
            });

            it('should support mutating an initialzer into an accessor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.eql("prop");
                    expect(descriptor).to.be.an('object');

                    let {initializer} = descriptor;
                    delete descriptor.initializer;
                    delete descriptor.writable;

                    let value;
                    descriptor.get = function(){
                        if (initializer){
                            value = '__' + initializer.call(this) + '__';
                            initializer = null;
                        }
                        return value;
                    };
                }

                class Example {
                    @dec
                    static prop = 3;
                }

                expect(Example.prop).to.eql('__3__');
            });

            it('should allow returning a descriptor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.be.a('string');
                    expect(descriptor).to.be.an('object');

                    target.decoratedProps = (target.decoratedProps || []).concat([name]);

                    let initializer = descriptor.initializer;
                    return {
                        enumerable: name.indexOf('enum') !== -1,
                        configurable: name.indexOf('conf') !== -1,
                        writable: name.indexOf('write') !== -1,
                        initializer: function(...args){
                            return '__' + initializer.apply(this, args) + '__';
                        },
                    };
                }

                class Example {
                    @dec
                    static enumconfwrite = 1;

                    @dec
                    static enumconf = 2;

                    @dec
                    static enumwrite = 3;

                    @dec
                    static enum = 4;

                    @dec
                    static confwrite = 5;

                    @dec
                    static conf = 6;

                    @dec
                    static write = 7;

                    @dec
                    static _ = 8;
                }
                const inst = new Example();

                expect(Example).to.have.ownProperty('decoratedProps');
                expect(Example.decoratedProps).to.eql([
                    "enumconfwrite",
                    "enumconf",
                    "enumwrite",
                    "enum",
                    "confwrite",
                    "conf",
                    "write",
                    "_",
                ]);

                const descs = Object.getOwnPropertyDescriptors(Example);
                expect(descs.enumconfwrite.enumerable).to.be.true;
                expect(descs.enumconfwrite.writable).to.be.true;
                expect(descs.enumconfwrite.configurable).to.be.true;
                expect(Example.enumconfwrite).to.eql('__1__');

                expect(descs.enumconf.enumerable).to.be.true;
                expect(descs.enumconf.writable).to.be.false;
                expect(descs.enumconf.configurable).to.be.true;
                expect(Example.enumconf).to.eql('__2__');

                expect(descs.enumwrite.enumerable).to.be.true;
                expect(descs.enumwrite.writable).to.be.true;
                expect(descs.enumwrite.configurable).to.be.false;
                expect(Example.enumwrite).to.eql('__3__');

                expect(descs.enum.enumerable).to.be.true;
                expect(descs.enum.writable).to.be.false;
                expect(descs.enum.configurable).to.be.false;
                expect(Example.enum).to.eql('__4__');

                expect(descs.confwrite.enumerable).to.be.false;
                expect(descs.confwrite.writable).to.be.true;
                expect(descs.confwrite.configurable).to.be.true;
                expect(Example.confwrite).to.eql('__5__');

                expect(descs.conf.enumerable).to.be.false;
                expect(descs.conf.writable).to.be.false;
                expect(descs.conf.configurable).to.be.true;
                expect(Example.conf).to.eql('__6__');

                expect(descs.write.enumerable).to.be.false;
                expect(descs.write.writable).to.be.true;
                expect(descs.write.configurable).to.be.false;
                expect(Example.write).to.eql('__7__');

                expect(descs._.enumerable).to.be.false;
                expect(descs._.writable).to.be.false;
                expect(descs._.configurable).to.be.false;
                expect(Example._).to.eql('__8__');
            });

            it('should allow mutating the original descriptor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.be.a('string');
                    expect(descriptor).to.be.an('object');

                    target.decoratedProps = (target.decoratedProps || []).concat([name]);

                    let initializer = descriptor.initializer;
                    Object.assign(descriptor, {
                        enumerable: name.indexOf('enum') !== -1,
                        configurable: name.indexOf('conf') !== -1,
                        writable: name.indexOf('write') !== -1,
                        initializer: function(...args){
                            return '__' + initializer.apply(this, args) + '__';
                        },
                    });
                }

                class Example {
                    @dec
                    static enumconfwrite = 1;

                    @dec
                    static enumconf = 2;

                    @dec
                    static enumwrite = 3;

                    @dec
                    static enum = 4;

                    @dec
                    static confwrite = 5;

                    @dec
                    static conf = 6;

                    @dec
                    static write = 7;

                    @dec
                    static _ = 8;
                }
                const inst = new Example();

                expect(Example).to.have.ownProperty('decoratedProps');
                expect(Example.decoratedProps).to.eql([
                    "enumconfwrite",
                    "enumconf",
                    "enumwrite",
                    "enum",
                    "confwrite",
                    "conf",
                    "write",
                    "_",
                ]);

                const descs = Object.getOwnPropertyDescriptors(Example);
                expect(descs.enumconfwrite.enumerable).to.be.true;
                expect(descs.enumconfwrite.writable).to.be.true;
                expect(descs.enumconfwrite.configurable).to.be.true;
                expect(Example.enumconfwrite).to.eql('__1__');

                expect(descs.enumconf.enumerable).to.be.true;
                expect(descs.enumconf.writable).to.be.false;
                expect(descs.enumconf.configurable).to.be.true;
                expect(Example.enumconf).to.eql('__2__');

                expect(descs.enumwrite.enumerable).to.be.true;
                expect(descs.enumwrite.writable).to.be.true;
                expect(descs.enumwrite.configurable).to.be.false;
                expect(Example.enumwrite).to.eql('__3__');

                expect(descs.enum.enumerable).to.be.true;
                expect(descs.enum.writable).to.be.false;
                expect(descs.enum.configurable).to.be.false;
                expect(Example.enum).to.eql('__4__');

                expect(descs.confwrite.enumerable).to.be.false;
                expect(descs.confwrite.writable).to.be.true;
                expect(descs.confwrite.configurable).to.be.true;
                expect(Example.confwrite).to.eql('__5__');

                expect(descs.conf.enumerable).to.be.false;
                expect(descs.conf.writable).to.be.false;
                expect(descs.conf.configurable).to.be.true;
                expect(Example.conf).to.eql('__6__');

                expect(descs.write.enumerable).to.be.false;
                expect(descs.write.writable).to.be.true;
                expect(descs.write.configurable).to.be.false;
                expect(Example.write).to.eql('__7__');

                expect(descs._.enumerable).to.be.false;
                expect(descs._.writable).to.be.false;
                expect(descs._.configurable).to.be.false;
                expect(Example._).to.eql('__8__');
            });
        });
    });

    describe('object', function(){
        describe('ordering', function(){
            it('should evaluate descriptor expressions in order', function(){
                const calls = [];
                function dec(id){
                    calls.push(id);
                    return function(){};
                }

                const obj = {
                    @dec(1)
                    @dec(2)
                    method1(){},

                    @dec(3)
                    @dec(4)
                    prop1: 1,

                    @dec(5)
                    @dec(6)
                    method2(){},

                    @dec(7)
                    @dec(8)
                    prop2: 2,
                }

                expect(calls).to.eql([1, 2, 3, 4, 5, 6, 7, 8]);
            });

            it('should call descriptors in reverse order per-method', function(){
                const calls = [];
                function dec(id){
                    return function(){
                        calls.push(id);
                    };
                }

                const obj = {
                    @dec(2)
                    @dec(1)
                    method1(){},

                    @dec(4)
                    @dec(3)
                    prop1: 1,

                    @dec(6)
                    @dec(5)
                    method2(){},

                    @dec(8)
                    @dec(7)
                    prop2: 2,
                }

                expect(calls).to.eql([1, 2, 3, 4, 5, 6, 7, 8]);
            });
        });

        describe('methods', function(){
            it('should support numeric props', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.eql(4);
                    expect(descriptor).to.be.an('object');
                }

                const inst = {
                    @dec
                    4(){

                    }
                };
            });

            it('should support string props', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.eql("str");
                    expect(descriptor).to.be.an('object');
                }

                const inst = {
                    @dec
                    "str"(){

                    }
                };
            });

            it('should allow returning a descriptor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.be.a('string');
                    expect(descriptor).to.be.an('object');

                    target.decoratedProps = (target.decoratedProps || []).concat([name]);

                    let value = descriptor.value;
                    return {
                        enumerable: name.indexOf('enum') !== -1,
                        configurable: name.indexOf('conf') !== -1,
                        writable: name.indexOf('write') !== -1,
                        value: function(...args){
                            return '__' + value.apply(this, args) + '__';
                        },
                    };
                }

                const inst = {
                    @dec
                    enumconfwrite(){
                        return 1;
                    },

                    @dec
                    enumconf(){
                        return 2;
                    },

                    @dec
                    enumwrite(){
                        return 3;
                    },

                    @dec
                    enum(){
                        return 4;
                    },

                    @dec
                    confwrite(){
                        return 5;
                    },

                    @dec
                    conf(){
                        return 6;
                    },

                    @dec
                    write(){
                        return 7;
                    },

                    @dec
                    _(){
                        return 8;
                    },
                }

                expect(inst).to.have.ownProperty('decoratedProps');
                expect(inst.decoratedProps).to.eql([
                    "enumconfwrite",
                    "enumconf",
                    "enumwrite",
                    "enum",
                    "confwrite",
                    "conf",
                    "write",
                    "_",
                ]);

                const descs = Object.getOwnPropertyDescriptors(inst);
                expect(descs.enumconfwrite.enumerable).to.be.true;
                expect(descs.enumconfwrite.writable).to.be.true;
                expect(descs.enumconfwrite.configurable).to.be.true;
                expect(inst.enumconfwrite()).to.eql('__1__');

                expect(descs.enumconf.enumerable).to.be.true;
                expect(descs.enumconf.writable).to.be.false;
                expect(descs.enumconf.configurable).to.be.true;
                expect(inst.enumconf()).to.eql('__2__');

                expect(descs.enumwrite.enumerable).to.be.true;
                expect(descs.enumwrite.writable).to.be.true;
                expect(descs.enumwrite.configurable).to.be.false;
                expect(inst.enumwrite()).to.eql('__3__');

                expect(descs.enum.enumerable).to.be.true;
                expect(descs.enum.writable).to.be.false;
                expect(descs.enum.configurable).to.be.false;
                expect(inst.enum()).to.eql('__4__');

                expect(descs.confwrite.enumerable).to.be.false;
                expect(descs.confwrite.writable).to.be.true;
                expect(descs.confwrite.configurable).to.be.true;
                expect(inst.confwrite()).to.eql('__5__');

                expect(descs.conf.enumerable).to.be.false;
                expect(descs.conf.writable).to.be.false;
                expect(descs.conf.configurable).to.be.true;
                expect(inst.conf()).to.eql('__6__');

                expect(descs.write.enumerable).to.be.false;
                expect(descs.write.writable).to.be.true;
                expect(descs.write.configurable).to.be.false;
                expect(inst.write()).to.eql('__7__');

                expect(descs._.enumerable).to.be.false;
                expect(descs._.writable).to.be.false;
                expect(descs._.configurable).to.be.false;
                expect(inst._()).to.eql('__8__');
            });

            it('should allow mutating the original descriptor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.be.a('string');
                    expect(descriptor).to.be.an('object');

                    target.decoratedProps = (target.decoratedProps || []).concat([name]);

                    let value = descriptor.value;
                    Object.assign(descriptor, {
                        enumerable: name.indexOf('enum') !== -1,
                        configurable: name.indexOf('conf') !== -1,
                        writable: name.indexOf('write') !== -1,
                        value: function(...args){
                            return '__' + value.apply(this, args) + '__';
                        },
                    });
                }

                const inst = {
                    @dec
                    enumconfwrite(){
                        return 1;
                    },

                    @dec
                    enumconf(){
                        return 2;
                    },

                    @dec
                    enumwrite(){
                        return 3;
                    },

                    @dec
                    enum(){
                        return 4;
                    },

                    @dec
                    confwrite(){
                        return 5;
                    },

                    @dec
                    conf(){
                        return 6;
                    },

                    @dec
                    write(){
                        return 7;
                    },

                    @dec
                    _(){
                        return 8;
                    },
                }

                expect(inst).to.have.ownProperty('decoratedProps');
                expect(inst.decoratedProps).to.eql([
                    "enumconfwrite",
                    "enumconf",
                    "enumwrite",
                    "enum",
                    "confwrite",
                    "conf",
                    "write",
                    "_",
                ]);

                const descs = Object.getOwnPropertyDescriptors(inst);
                expect(descs.enumconfwrite.enumerable).to.be.true;
                expect(descs.enumconfwrite.writable).to.be.true;
                expect(descs.enumconfwrite.configurable).to.be.true;
                expect(inst.enumconfwrite()).to.eql('__1__');

                expect(descs.enumconf.enumerable).to.be.true;
                expect(descs.enumconf.writable).to.be.false;
                expect(descs.enumconf.configurable).to.be.true;
                expect(inst.enumconf()).to.eql('__2__');

                expect(descs.enumwrite.enumerable).to.be.true;
                expect(descs.enumwrite.writable).to.be.true;
                expect(descs.enumwrite.configurable).to.be.false;
                expect(inst.enumwrite()).to.eql('__3__');

                expect(descs.enum.enumerable).to.be.true;
                expect(descs.enum.writable).to.be.false;
                expect(descs.enum.configurable).to.be.false;
                expect(inst.enum()).to.eql('__4__');

                expect(descs.confwrite.enumerable).to.be.false;
                expect(descs.confwrite.writable).to.be.true;
                expect(descs.confwrite.configurable).to.be.true;
                expect(inst.confwrite()).to.eql('__5__');

                expect(descs.conf.enumerable).to.be.false;
                expect(descs.conf.writable).to.be.false;
                expect(descs.conf.configurable).to.be.true;
                expect(inst.conf()).to.eql('__6__');

                expect(descs.write.enumerable).to.be.false;
                expect(descs.write.writable).to.be.true;
                expect(descs.write.configurable).to.be.false;
                expect(inst.write()).to.eql('__7__');

                expect(descs._.enumerable).to.be.false;
                expect(descs._.writable).to.be.false;
                expect(descs._.configurable).to.be.false;
                expect(inst._()).to.eql('__8__');
            });
        });

        describe('properties', function(){
            it('should support numeric props', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.eql(4);
                    expect(descriptor).to.be.an('object');
                }

                const inst = {
                    @dec
                    4: 1
                };
            });

            it('should support string props', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.eql("str");
                    expect(descriptor).to.be.an('object');
                }

                const inst = {
                    @dec
                    "str": 1
                };
            });

            it('should support mutating an initialzer into an accessor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.eql("prop");
                    expect(descriptor).to.be.an('object');

                    let {initializer} = descriptor;
                    delete descriptor.initializer;
                    delete descriptor.writable;

                    let value;
                    descriptor.get = function(){
                        if (initializer){
                            value = '__' + initializer.call(this) + '__';
                            initializer = null;
                        }
                        return value;
                    };
                }

                let inst = {
                    @dec
                    prop: 3
                };

                expect(inst.prop).to.eql('__3__');
            });

            it('should allow returning a descriptor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.be.a('string');
                    expect(descriptor).to.be.an('object');

                    target.decoratedProps = (target.decoratedProps || []).concat([name]);

                    let initializer = descriptor.initializer;
                    return {
                        enumerable: name.indexOf('enum') !== -1,
                        configurable: name.indexOf('conf') !== -1,
                        writable: name.indexOf('write') !== -1,
                        initializer: function(...args){
                            return '__' + initializer.apply(this, args) + '__';
                        },
                    };
                }

                const inst = {
                    @dec
                    enumconfwrite: 1,

                    @dec
                    enumconf: 2,

                    @dec
                    enumwrite: 3,

                    @dec
                    enum: 4,

                    @dec
                    confwrite: 5,

                    @dec
                    conf: 6,

                    @dec
                    write: 7,

                    @dec
                    _: 8,
                };

                expect(inst).to.have.ownProperty('decoratedProps');
                expect(inst.decoratedProps).to.eql([
                    "enumconfwrite",
                    "enumconf",
                    "enumwrite",
                    "enum",
                    "confwrite",
                    "conf",
                    "write",
                    "_",
                ]);

                const descs = Object.getOwnPropertyDescriptors(inst);
                expect(descs.enumconfwrite.enumerable).to.be.true;
                expect(descs.enumconfwrite.writable).to.be.true;
                expect(descs.enumconfwrite.configurable).to.be.true;
                expect(inst.enumconfwrite).to.eql('__1__');

                expect(descs.enumconf.enumerable).to.be.true;
                expect(descs.enumconf.writable).to.be.false;
                expect(descs.enumconf.configurable).to.be.true;
                expect(inst.enumconf).to.eql('__2__');

                expect(descs.enumwrite.enumerable).to.be.true;
                expect(descs.enumwrite.writable).to.be.true;
                expect(descs.enumwrite.configurable).to.be.false;
                expect(inst.enumwrite).to.eql('__3__');

                expect(descs.enum.enumerable).to.be.true;
                expect(descs.enum.writable).to.be.false;
                expect(descs.enum.configurable).to.be.false;
                expect(inst.enum).to.eql('__4__');

                expect(descs.confwrite.enumerable).to.be.false;
                expect(descs.confwrite.writable).to.be.true;
                expect(descs.confwrite.configurable).to.be.true;
                expect(inst.confwrite).to.eql('__5__');

                expect(descs.conf.enumerable).to.be.false;
                expect(descs.conf.writable).to.be.false;
                expect(descs.conf.configurable).to.be.true;
                expect(inst.conf).to.eql('__6__');

                expect(descs.write.enumerable).to.be.false;
                expect(descs.write.writable).to.be.true;
                expect(descs.write.configurable).to.be.false;
                expect(inst.write).to.eql('__7__');

                expect(descs._.enumerable).to.be.false;
                expect(descs._.writable).to.be.false;
                expect(descs._.configurable).to.be.false;
                expect(inst._).to.eql('__8__');
            });

            it('should allow mutating the original descriptor', function(){
                function dec(target, name, descriptor){
                    expect(target).to.be.ok;
                    expect(name).to.be.a('string');
                    expect(descriptor).to.be.an('object');

                    target.decoratedProps = (target.decoratedProps || []).concat([name]);

                    let initializer = descriptor.initializer;
                    Object.assign(descriptor, {
                        enumerable: name.indexOf('enum') !== -1,
                        configurable: name.indexOf('conf') !== -1,
                        writable: name.indexOf('write') !== -1,
                        initializer: function(...args){
                            return '__' + initializer.apply(this, args) + '__';
                        },
                    });
                }

                const inst = {
                    @dec
                    enumconfwrite: 1,

                    @dec
                    enumconf: 2,

                    @dec
                    enumwrite: 3,

                    @dec
                    enum: 4,

                    @dec
                    confwrite: 5,

                    @dec
                    conf: 6,

                    @dec
                    write: 7,

                    @dec
                    _: 8,
                };

                expect(inst).to.have.ownProperty('decoratedProps');
                expect(inst.decoratedProps).to.eql([
                    "enumconfwrite",
                    "enumconf",
                    "enumwrite",
                    "enum",
                    "confwrite",
                    "conf",
                    "write",
                    "_",
                ]);

                const descs = Object.getOwnPropertyDescriptors(inst);
                expect(descs.enumconfwrite.enumerable).to.be.true;
                expect(descs.enumconfwrite.writable).to.be.true;
                expect(descs.enumconfwrite.configurable).to.be.true;
                expect(inst.enumconfwrite).to.eql('__1__');

                expect(descs.enumconf.enumerable).to.be.true;
                expect(descs.enumconf.writable).to.be.false;
                expect(descs.enumconf.configurable).to.be.true;
                expect(inst.enumconf).to.eql('__2__');

                expect(descs.enumwrite.enumerable).to.be.true;
                expect(descs.enumwrite.writable).to.be.true;
                expect(descs.enumwrite.configurable).to.be.false;
                expect(inst.enumwrite).to.eql('__3__');

                expect(descs.enum.enumerable).to.be.true;
                expect(descs.enum.writable).to.be.false;
                expect(descs.enum.configurable).to.be.false;
                expect(inst.enum).to.eql('__4__');

                expect(descs.confwrite.enumerable).to.be.false;
                expect(descs.confwrite.writable).to.be.true;
                expect(descs.confwrite.configurable).to.be.true;
                expect(inst.confwrite).to.eql('__5__');

                expect(descs.conf.enumerable).to.be.false;
                expect(descs.conf.writable).to.be.false;
                expect(descs.conf.configurable).to.be.true;
                expect(inst.conf).to.eql('__6__');

                expect(descs.write.enumerable).to.be.false;
                expect(descs.write.writable).to.be.true;
                expect(descs.write.configurable).to.be.false;
                expect(inst.write).to.eql('__7__');

                expect(descs._.enumerable).to.be.false;
                expect(descs._.writable).to.be.false;
                expect(descs._.configurable).to.be.false;
                expect(inst._).to.eql('__8__');
            });
        });
    });
});
