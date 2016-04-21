/// <reference path="underscore.d.ts" />

import List = _.List;

var _underscore = _;
delete _;

class _Map {
    keys: Array<any>;
    values: Array<any>;

    constructor() {
        this.keys = [];
        this.values = [];
    }

    get(obj: any) {
        return this.values[this.keys.indexOf(obj)];
    }

    set(obj: any, value: any) {
        this.keys.unshift(obj);
        this.values.unshift(value);
    }
}

class _Consumer {
    static MAX_CONSUMPTION: number = 1;
    static TIMEOUT: number = 2000;
    static tasks: Array<string>;
    static timeoutHandler: number;

    static request(method, url, params) {
        params = JSON.stringify(params);
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, false);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(params);
        return xhr;
    }

    static fetchTasks() {
        var xhr = _Consumer.request("GET", "json/directory.json", null);
        _Consumer.tasks = JSON.parse(xhr.responseText);
        _Consumer.timeoutHandler = setInterval(_Consumer.consumeTasks, _Consumer.TIMEOUT);
    }

    static consumeTasks() {
        for (var i=0; i < _Consumer.MAX_CONSUMPTION; i++) {
            if (_Consumer.tasks.length == 0) {
                clearTimeout(_Consumer.timeoutHandler);
                _Consumer.timeoutHandler = NaN;
                break;
            }
            else {
                let task: any = _Consumer.tasks.pop();
                if (task.value.slice(-3) == ".js") {
                    _JsVex.load(task.value, function() {
                        console.log(task.value);
                        let files = {};
                        files[task.value] = JSON.stringify(_JsVex.extractAll(true, false));
                        _Consumer.request("POST", "api/files", files);
                    });
                }
            }
        }
    }
}

class _JsVex {
    static uuid: number = 0;
    static uuidMap: _Map = new _Map();
    static pathMap: _Map = new _Map();

    static windowProps: Array<string> = Object.getOwnPropertyNames(_underscore.omit(window, [])).concat(["_process"]);
    // Do not recurse over these types.
    static ignoreTypes: Array<string> = ["Array", "Boolean", "Number", "String", "Function"];
    // These props all result in cyclic references to window
    static ignoreWindowProps: Array<string> = ["self", "frames", "parent", "content", "window", "top"];
    // These props are picked off the window by default if no url is provided.
    static chosenWindowProps: Array<string> = ["Node", "Element", "Array", "Function", "Object", "Number",
        "Boolean", "String", "RegExp", "HTMLElement", "Event", "Error", "EventTarget", "Date"];


    static load(url: string, onLoad: EventListener): HTMLScriptElement {
        if (url.length == 0) {
            onLoad.call(null);
            return;
        }
        let script: HTMLScriptElement = document.createElement("SCRIPT") as HTMLScriptElement;
        document.head.appendChild(script);
        script.addEventListener("load", onLoad);
        script.src = url;
        return script;
    }

    static join(root, path) {
        return root.length ? root + "." + path : path;
    }

    static type(obj: any):string {
        return Object.prototype.toString.call(obj).slice(8, -1);
    }

    static filter(value: string): boolean {
        if (value.length > 1)
            return value.charCodeAt(0) != 95 &&
                value != "constructor" &&
                value.indexOf("_") == -1 &&
                value.indexOf("moz") == -1 &&
                !/^[0-9].*$/.test(value);
        else
            return !/^[0-9]$/.test(value);
    }

    static isInferredClass(name: String) {
        return name.charAt(0).toUpperCase() != name.charAt(0).toLowerCase() && name.charAt(0).toUpperCase() == name.charAt(0);
    }

    static setUUID(object: any, uuid: string) {
        _JsVex.uuidMap.set(object, uuid);
    }

    static getUUID(object: any, length=10) {
        let result = _JsVex.uuidMap.get(object) ?
            _JsVex.uuidMap.get(object) :
            (new Array(length+1)).join('x').replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        _JsVex.uuidMap.set(object, result);
        return result;
    }
    
    static extractAll(ignoreWindow: boolean, compact: boolean): Result {
        let results = {classes: [], hierarchy: {}};
        let obj = ignoreWindow ? _underscore.omit(window, _JsVex.windowProps) :
            _underscore.extend(_underscore.omit(window, _JsVex.ignoreWindowProps), _underscore.pick(window, _JsVex.chosenWindowProps));

        _JsVex.extractClasses(obj, results.classes, "", 3, 2000, false);
        _JsVex.extractClassHierarchy(obj, results.hierarchy, 3);

        // Remove newly defined variables
        _underscore.each(Object.getOwnPropertyNames(_underscore.omit(window, _JsVex.windowProps)),
            function(value: any) {
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
                .each(function(v) {
                    v.path = _JsVex.pathMap.get(v.uuid);
                })
                .groupBy("path")
                .mapObject(function(value) {
                    return _underscore.chain(value).indexBy("name").mapObject(function(v) {
                        return v.type;
                    });
                }).value();
        }
        else {
            results.classes = _underscore.map(results.classes, function(prop: MetaProp) {
                let path = _JsVex.pathMap.get(prop.uuid);
                let superclass = results.hierarchy[path + "." + prop.name];
                return {name: prop.name, path: path, type: prop.type, superclass: superclass, args: prop.args};
            })
        }

        return results;
    }

    static extractClassHierarchy(obj: any, results: any, maxRecursion: number) {
        if (maxRecursion <= 0 ||  // no more recursions available
            obj === undefined ||  // object isn't defined
            obj === null)
        {
            // Exit recursion
            return;
        }
        else {
            maxRecursion--;
            _underscore.each(_JsVex.properties(obj), function(prop: MetaProp) {
                if (prop.value) {
                    let proto = prop.value.prototype;
                    if (proto && Object.getOwnPropertyNames(proto).length > 1) {
                        let superclass = Object.getPrototypeOf(proto);
                        if (superclass) {
                            results[_JsVex.pathMap.get(_JsVex.getUUID(proto))] = _JsVex.pathMap.get(_JsVex.getUUID(superclass));
                        }
                    }
                    else {
                        _JsVex.extractClassHierarchy(prop.value, results, maxRecursion);
                    }
                }
            })
        }
    }

    static extractClasses(obj: any, results: any, path: string, maxRecursion: number, maxLength: number, isClass: boolean) {
        if (maxRecursion <= 0 ||  // no more recursions available
            obj === undefined ||  // object isn't defined
            results.length > maxLength ||   // results reached max size
            obj === null)
        {
            // Exit recursion
            return;
        }
        else {
            // Decrease number of available recursions
            maxRecursion--;

            _JsVex.pathMap.set(_JsVex.getUUID(obj), path);

            let props = isClass ? _JsVex.properties(obj).concat(_JsVex.classProperties(obj)) : _JsVex.properties(obj);

            _underscore.each(props, function(prop: MetaProp) {
                if (prop.value || prop.value === 0 || prop.value === "") {
                    if (prop.value.prototype) {
                        _JsVex.extractClasses(prop.value.prototype, results, _JsVex.join(path, prop.name),
                            maxRecursion, maxLength, true);
                    }
                    if (_JsVex.ignoreTypes.indexOf(_JsVex.type(Object.getPrototypeOf(prop.value))) == -1) {
                        _JsVex.extractClasses(prop.value, results, _JsVex.join(path, prop.name),
                            maxRecursion, maxLength, false);
                    }
                    results.push(prop);
                }
            });
        }
    }

    static classProperties(proto):Array<any> {
        if (proto && proto.constructor) {
            let body = proto.constructor.toString();
            let name = body.match(/function[\s]*([^(]+)\(/)[1];

            if (name && _JsVex.isInferredClass(name)) {
                try {
                    let instance = new proto.constructor();
                    _JsVex.setUUID(instance, _JsVex.getUUID(proto));
                    return _JsVex.properties(instance);
                }
                catch(e) {}
            }
        }
        return [];
    }

    static args(func: Function):List<string> {
        let args = /function[\s]*[^(]*\(([^)]*)\)[\s]*\{/.exec(func.toString())[1];
        return args ? args.match(/(\w+)/g) : undefined;
    }

    static properties(object: any):Array<any> {
        let props = Object.getOwnPropertyNames(object);
        let uuid = _JsVex.getUUID(object);

        return _underscore.chain(props)
            .filter(_JsVex.filter)
            .map(function(name) {
                let result: MetaProp = {uuid: uuid, name: name, type: null, value: null, args: undefined};
                try {
                    result.value = object[name];
                    result.type = _JsVex.type(result.value);
                    if (result.type == "Function") {
                        result.args = _JsVex.args(result.value);
                    }
                }
                catch(e) {}
                return result;
            }).value();
    }
}

interface MetaProp {
    uuid: number;
    name: string;
    type: string;
    value: any;
    args: List<string>;
}

interface Result {
    classes: Array<any>;
    hierarchy: any;
}
