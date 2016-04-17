/// <reference path="underscore.d.ts" />

import List = _.List;

var _underscore = _;
delete _;

class _JsVex {
    static uuid: number = 0;
    static uuidMap: Map = new Map();
    static pathMap: Map = new Map();

    static windowProps: Array<string> = _underscore.keys(_underscore.omit(window, ["_"]));
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
        console.log(url);
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
                value.toUpperCase() != value &&
                value != "constructor" &&
                value.indexOf("_") == -1 &&
                value.indexOf("moz") == -1;
        else
            return value.charCodeAt(0) == 95;
    }

    static getUUID(object: any) {
        let result = _JsVex.uuidMap.get(object) ?
            _JsVex.uuidMap.get(object) :
            'xxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        _JsVex.uuidMap.set(object, result);
        return result;
    }
    
    static extractAll(ignoreWindow: boolean): Result {
        let results = {"classes": [], "hierarchy": {}};
        let obj = ignoreWindow ? _underscore.omit(window, _JsVex.windowProps) :
            _underscore.extend(_underscore.omit(window, _JsVex.ignoreWindowProps), _underscore.pick(window, _JsVex.chosenWindowProps));
        
        _JsVex.extractClasses(obj, results["classes"], "", 3, 2000);
        _JsVex.extractClassHierarchy(obj, results["hierarchy"], 3);

        results["classes"] = _underscore.chain(results["classes"])
            .groupBy("uuid")
            .mapObject(function(value, uuid) {
                return {path: _JsVex.pathMap.get(uuid), properties: _underscore.chain(value).indexBy("name").mapObject(function(v) {
                    return v.type;
                })};
            }).value();
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
                            results[_JsVex.getUUID(proto)] = _JsVex.getUUID(superclass);
                        }
                    }
                    else {
                        _JsVex.extractClassHierarchy(prop.value, results, maxRecursion);
                    }
                }
            })
        }
    }

    static extractClasses(obj: any, results: any, path: string, maxRecursion: number, maxLength: number) {
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

            _underscore.each(_JsVex.properties(obj), function(prop: MetaProp) {
                if (prop.value) {
                    if (prop.value.prototype) {
                        _JsVex.extractClasses(prop.value.prototype, results, _JsVex.join(path, prop.name),
                            maxRecursion, maxLength);
                    }
                    if (_JsVex.ignoreTypes.indexOf(_JsVex.type(Object.getPrototypeOf(prop.value))) == -1) {
                        _JsVex.extractClasses(prop.value, results, _JsVex.join(path, prop.name), maxRecursion, maxLength);
                    }
                    results.push(prop);
                }
            });
        }
    }

    static properties(object: any):List<any> {
        let props = Object.getOwnPropertyNames(object);
        let uuid = _JsVex.getUUID(object);

        return _underscore.chain(props)
            .filter(_JsVex.filter)
            .map(function(name) {
                let result: MetaProp = {uuid: uuid, name: name, type: null, value: null};
                try {
                    result.value = object[name];
                    result.type = _JsVex.type(result.value);
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
}

interface Result {
    classes: Array<any>;
    hierarchy: any;
}

interface Map {
    get: Function;
    set: Function;
}