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
            return value.charCodeAt(0) != 95 && value !=  "prototype" && value != "constructor" && value.toUpperCase() != value &&
                value.indexOf("moz") == -1 && (value.indexOf("HTML") == -1 || value == "HTMLElement");
        else
            return value.charCodeAt(0) == 95;
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
            let value = undefined;
            try {
                value = obj[prop.name];
            }
            catch(e) {
                return;
            }
            if (_JsVex.cache.indexOf(prop.type) == -1) _JsVex.cache.push(prop.type);

            if (value && value.prototype && prop.name.length < 15) {
                let path = prop.name;
                let proto = Object.getPrototypeOf(value.prototype);
                if (proto) {
                    let str = proto.constructor.toString();
                    path += ":" + str.slice(9, str.indexOf("("));
                }

                _JsVex.extractClasses(value.prototype, results, path, maxRecursion, maxLength, true);
                if (_JsVex.cache.indexOf(prop.name) == -1) _JsVex.cache.push(prop.name);
            }

            _JsVex.extractClasses(value, results, path + "." + prop.name, maxRecursion, maxLength, false);
            if (add && value) results.push(prop);
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
                // try {
                //     let value = object[name];
                //     return {name: name, path: path, type: _JsVex.type(value)};
                // }
                // catch(e) {
                //     return {name: name, path: path};
                // }
                return {name: name, path: path};
            }).value();
    }
}

interface MetaProp {
    name: string;
    path: string;
    type: string;
}