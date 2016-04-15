/// <reference path="underscore.d.ts" />

import List = _.List;

class _JsVex {
    static cache: Array<string> = [];

    static load(url: string, onLoad: EventListener): HTMLScriptElement {
        let script: HTMLScriptElement = document.createElement("SCRIPT") as HTMLScriptElement;
        document.head.appendChild(script);
        script.addEventListener("load", onLoad);
        script.src = url;
        return script;
    }

    static type(obj: any):string {
        return Object.prototype.toString.call(obj).slice(8, -1);
    }

    static filter(value: string): boolean {
        if (value.length > 1)
            return value.charCodeAt(0) != 95 && value.toUpperCase() != value && value != "constructor" && value.indexOf("moz") == -1;
        else
            return value.charCodeAt(0) == 95;
    }

    static extractClassHierarchy(obj: any, results: any) {
        _.each(_JsVex.getProps(obj, ""), function(prop: MetaProp) {
            let value = obj[prop.name];
            if (value.prototype) {
                if (Object.getPrototypeOf(value.prototype)) {
                    let proto = Object.getPrototypeOf(value.prototype).constructor.toString();
                    results[prop.name] = proto.slice(9, proto.indexOf('('));
                }
                else {
                    results[prop.name] = null;
                }
            }
        })
    }

    static extractClasses(obj: any, results: any, path: string, maxRecursion: number, maxLength: number, add: boolean) {
        if (maxRecursion <= 0 ||  // no more recursions available
            obj === undefined ||  // object isn't defined
            obj === null ||
            results.length > maxLength ||   // results reached max size
            _JsVex.cache.indexOf(_JsVex.type(obj)) != -1  // object type already cached
        ) {
            // Exit recursion
            return results;
        }
        // Decrease number of available recursions
        maxRecursion--;

        _.each(_JsVex.getProps(obj, path), function(prop: MetaProp) {
            let value;
            try {
                value = obj[prop.name];
            }
            catch(e) {
                return;
            }

            if (value && value.prototype) {
                _JsVex.extractClasses(value.prototype, results, prop.name, maxRecursion, maxLength, true);
                if (_JsVex.cache.indexOf(prop.name) == -1) _JsVex.cache.push(prop.name);
            }

            _JsVex.extractClasses(value, results, path + "." + prop.name, maxRecursion, maxLength, false);
            if (add) results.push(prop);
        });
    }
    
    static getArgs(fun: Function):string {
        if (_JsVex.type(fun) == "Function")
            return fun.toString().match(/^[\s\(]*function[^(]*(\([^)]*\))/)[1];
    }

    static getProps(object: any, path: string):List<any> {
        let props = Object.getOwnPropertyNames(object);

        return _.chain(props)
            .filter(_JsVex.filter)
            .map(function(name) {
                try {
                    return {name: name, path: path, type: _JsVex.type(object[name])};
                }
                catch(e) {
                    return {name: name, path: path};
                }
            }).value();
    }
}

interface MetaProp {
    name: string;
    path: string;
    type: string;
}