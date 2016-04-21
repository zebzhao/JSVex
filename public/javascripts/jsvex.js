/// <reference path="underscore.d.ts" />
var _underscore = _;
delete _;
var _Map = (function () {
    function _Map() {
        this.keys = [];
        this.values = [];
    }
    _Map.prototype.get = function (obj) {
        return this.values[this.keys.indexOf(obj)];
    };
    _Map.prototype.set = function (obj, value) {
        this.keys.unshift(obj);
        this.values.unshift(value);
    };
    return _Map;
}());
var _Consumer = (function () {
    function _Consumer() {
    }
    _Consumer.request = function (method, url, params) {
        params = JSON.stringify(params);
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, false);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(params);
        return xhr;
    };
    _Consumer.fetchTasks = function () {
        var xhr = _Consumer.request("GET", "json/directory.json", null);
        _Consumer.tasks = JSON.parse(xhr.responseText);
        _Consumer.timeoutHandler = setInterval(_Consumer.consumeTasks, _Consumer.TIMEOUT);
    };
    _Consumer.consumeTasks = function () {
        var _loop_1 = function() {
            if (_Consumer.tasks.length == 0) {
                clearTimeout(_Consumer.timeoutHandler);
                _Consumer.timeoutHandler = NaN;
                return "break";
            }
            else {
                var task_1 = _Consumer.tasks.pop();
                if (task_1.value.slice(-3) == ".js") {
                    _JsVex.load(task_1.value, function () {
                        console.log(task_1.value);
                        var files = {};
                        files[task_1.value] = JSON.stringify(_JsVex.extractAll(true, false));
                        _Consumer.request("POST", "api/files", files);
                    });
                }
            }
        };
        for (var i = 0; i < _Consumer.MAX_CONSUMPTION; i++) {
            var state_1 = _loop_1();
            if (state_1 === "break") break;
        }
    };
    _Consumer.MAX_CONSUMPTION = 1;
    _Consumer.TIMEOUT = 2000;
    return _Consumer;
}());
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
    _JsVex.getUUID = function (object, length) {
        if (length === void 0) { length = 10; }
        var result = _JsVex.uuidMap.get(object) ?
            _JsVex.uuidMap.get(object) :
            (new Array(length + 1)).join('x').replace(/[xy]/g, function (c) {
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
        // Remove newly defined variables
        _underscore.each(Object.getOwnPropertyNames(_underscore.omit(window, _JsVex.windowProps)), function (value) {
            if (window[value] !== undefined) {
                console.log("deleting", value);
                delete window[value];
                if (window[value]) {
                    console.log("cannot be deleted, ignoring:", value);
                    // Some vars declared with var in global scope CANNOT be deleted
                    window[value] = undefined;
                }
            }
        });
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
    _JsVex.uuidMap = new _Map();
    _JsVex.pathMap = new _Map();
    _JsVex.windowProps = Object.getOwnPropertyNames(_underscore.omit(window, [])).concat(["_process"]);
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