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
            return value.charCodeAt(0) != 95;
        else
            return value.charCodeAt(0) == 95;
    }

    static extract(obj: any, results: any, path: string, maxRecursion: number, maxLength: number) {
        if (maxRecursion <= 0 ||  // no more recursions available
            obj === undefined ||  // object isn't defined
            results.length > maxLength ||   // results reached max size
            _JsVex.cache.indexOf(_JsVex.type(obj)) != -1  // object type already cached
        ) {
            // Exit recursion
            return results;
        }

        // Decrease number of available recursions
        maxRecursion--;

        let basePath: string = path == "" ? path : path + ".";

        _.each(_JsVex.getProps(obj, 0, path || "global"), function(prop: MetaProp) {
            if (prop.type != "Object")
                _JsVex.cache.push(prop.type);

            _JsVex.extract(obj[prop.name], results, basePath + prop.name, maxRecursion, maxLength);

            results.push(prop);
        });

        return results;
    }

    static getProps(object: any, score: number, path: string):List<MetaProp> {
        return _.chain(Object.getOwnPropertyNames(object))
            .filter(_JsVex.filter)
            .map(function(name) {
                return {name: name, value: name, path: path, score: score, type: _JsVex.type(object[name])};
            }).value();
    }
}

interface MetaProp {
    name: string;
    value: string;
    path: string;
    score: number;
    type: string
}