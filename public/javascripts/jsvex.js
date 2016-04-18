/// <reference path="underscore.d.ts" />
var _underscore = _;
delete _;
var _JsVex = (function () {
    function _JsVex() {
    }
    _JsVex.load = function (url, onLoad) {
        if (url.length == 0) {
            onLoad.call(null);
            return;
        }
        var script = document.createElement("SCRIPT");
        document.head.appendChild(script);
        script.addEventListener("load", onLoad);
        script.src = url;
        console.log(url);
        return script;
    };
    _JsVex.join = function (root, path) {
        return root.length ? root + "." + path : path;
    };
    _JsVex.type = function (obj) {
        return Object.prototype.toString.call(obj).slice(8, -1);
    };
    _JsVex.filter = function (value) {
        if (value.length > 1)
            return value.charCodeAt(0) != 95 &&
                value.toUpperCase() != value &&
                value != "constructor" &&
                value.indexOf("_") == -1 &&
                value.indexOf("moz") == -1 &&
                !/^[0-9].*$/.test(value);
        else
            return !/^[0-9]$/.test(value);
    };
    _JsVex.isInferredClass = function (name) {
        return name.charAt(0).toUpperCase() != name.charAt(0).toLowerCase() && name.charAt(0).toUpperCase() == name.charAt(0);
    };
    _JsVex.setUUID = function (object, uuid) {
        _JsVex.uuidMap.set(object, uuid);
    };
    _JsVex.getUUID = function (object) {
        var result = _JsVex.uuidMap.get(object) ?
            _JsVex.uuidMap.get(object) :
            'xxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        _JsVex.uuidMap.set(object, result);
        return result;
    };
    _JsVex.extractAll = function (ignoreWindow, compact) {
        var results = { classes: [], hierarchy: {} };
        var obj = ignoreWindow ? _underscore.omit(window, _JsVex.windowProps) :
            _underscore.extend(_underscore.omit(window, _JsVex.ignoreWindowProps), _underscore.pick(window, _JsVex.chosenWindowProps));
        _JsVex.extractClasses(obj, results.classes, "", 3, 2000, false);
        _JsVex.extractClassHierarchy(obj, results.hierarchy, 3);
        if (compact) {
            results.classes = _underscore.chain(results.classes)
                .each(function (v) {
                v.path = _JsVex.pathMap.get(v.uuid);
            })
                .groupBy("path")
                .mapObject(function (value) {
                return _underscore.chain(value).indexBy("name").mapObject(function (v) {
                    return v.type;
                });
            }).value();
        }
        else {
            results.classes = _underscore.map(results.classes, function (prop) {
                var path = _JsVex.pathMap.get(prop.uuid);
                var superclass = results.hierarchy[path + "." + prop.name];
                return { name: prop.name, path: path, type: prop.type, superclass: superclass, args: prop.args };
            });
        }
        return results;
    };
    _JsVex.extractClassHierarchy = function (obj, results, maxRecursion) {
        if (maxRecursion <= 0 ||
            obj === undefined ||
            obj === null) {
            // Exit recursion
            return;
        }
        else {
            maxRecursion--;
            _underscore.each(_JsVex.properties(obj), function (prop) {
                if (prop.value) {
                    var proto = prop.value.prototype;
                    if (proto && Object.getOwnPropertyNames(proto).length > 1) {
                        var superclass = Object.getPrototypeOf(proto);
                        if (superclass) {
                            results[_JsVex.pathMap.get(_JsVex.getUUID(proto))] = _JsVex.pathMap.get(_JsVex.getUUID(superclass));
                        }
                    }
                    else {
                        _JsVex.extractClassHierarchy(prop.value, results, maxRecursion);
                    }
                }
            });
        }
    };
    _JsVex.extractClasses = function (obj, results, path, maxRecursion, maxLength, isClass) {
        if (maxRecursion <= 0 ||
            obj === undefined ||
            results.length > maxLength ||
            obj === null) {
            // Exit recursion
            return;
        }
        else {
            // Decrease number of available recursions
            maxRecursion--;
            _JsVex.pathMap.set(_JsVex.getUUID(obj), path);
            var props = isClass ? _JsVex.properties(obj).concat(_JsVex.classProperties(obj)) : _JsVex.properties(obj);
            _underscore.each(props, function (prop) {
                if (prop.value || prop.value === 0 || prop.value === "") {
                    if (prop.value.prototype) {
                        _JsVex.extractClasses(prop.value.prototype, results, _JsVex.join(path, prop.name), maxRecursion, maxLength, true);
                    }
                    if (_JsVex.ignoreTypes.indexOf(_JsVex.type(Object.getPrototypeOf(prop.value))) == -1) {
                        _JsVex.extractClasses(prop.value, results, _JsVex.join(path, prop.name), maxRecursion, maxLength, false);
                    }
                    results.push(prop);
                }
            });
        }
    };
    _JsVex.classProperties = function (proto) {
        if (proto && proto.constructor) {
            var body = proto.constructor.toString();
            var name_1 = body.match(/function[\s]*([^(]+)\(/)[1];
            if (name_1 && _JsVex.isInferredClass(name_1)) {
                try {
                    var instance = new proto.constructor();
                    _JsVex.setUUID(instance, _JsVex.getUUID(proto));
                    return _JsVex.properties(instance);
                }
                catch (e) { }
            }
        }
        return [];
    };
    _JsVex.args = function (func) {
        var args = /function[\s]*[^(]*\(([^)]*)\)[\s]*\{/.exec(func.toString())[1];
        return args ? args.match(/(\w+)/g) : undefined;
    };
    _JsVex.properties = function (object) {
        var props = Object.getOwnPropertyNames(object);
        var uuid = _JsVex.getUUID(object);
        return _underscore.chain(props)
            .filter(_JsVex.filter)
            .map(function (name) {
            var result = { uuid: uuid, name: name, type: null, value: null, args: undefined };
            try {
                result.value = object[name];
                result.type = _JsVex.type(result.value);
                if (result.type == "Function") {
                    result.args = _JsVex.args(result.value);
                }
            }
            catch (e) { }
            return result;
        }).value();
    };
    _JsVex.uuid = 0;
    _JsVex.uuidMap = new Map();
    _JsVex.pathMap = new Map();
    _JsVex.windowProps = _underscore.keys(_underscore.omit(window, ["_"]));
    // Do not recurse over these types.
    _JsVex.ignoreTypes = ["Array", "Boolean", "Number", "String", "Function"];
    // These props all result in cyclic references to window
    _JsVex.ignoreWindowProps = ["self", "frames", "parent", "content", "window", "top"];
    // These props are picked off the window by default if no url is provided.
    _JsVex.chosenWindowProps = ["Node", "Element", "Array", "Function", "Object", "Number",
        "Boolean", "String", "RegExp", "HTMLElement", "Event", "Error", "EventTarget", "Date"];
    return _JsVex;
}());
//# sourceMappingURL=jsvex.js.map