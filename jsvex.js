/// <reference path="underscore.d.ts" />
var _JsVex = (function () {
    function _JsVex() {
    }
    _JsVex.load = function (url, onLoad) {
        var script = document.createElement("SCRIPT");
        document.head.appendChild(script);
        script.addEventListener("load", onLoad);
        script.src = url;
        return script;
    };
    _JsVex.type = function (obj) {
        return Object.prototype.toString.call(obj).slice(8, -1);
    };
    _JsVex.filter = function (value) {
        if (value.length > 1)
            return value.charCodeAt(0) != 95;
        else
            return value.charCodeAt(0) == 95;
    };
    _JsVex.extract = function (obj, results, path, maxRecursion, maxLength) {
        if (maxRecursion <= 0 ||
            obj === undefined ||
            results.length > maxLength ||
            _JsVex.cache.indexOf(_JsVex.type(obj)) != -1 // object type already cached
        ) {
            // Exit recursion
            return results;
        }
        // Decrease number of available recursions
        maxRecursion--;
        var basePath = path == "" ? path : path + ".";
        _.each(_JsVex.getProps(obj, 0, path || "global"), function (prop) {
            if (prop.type != "Object")
                _JsVex.cache.push(prop.type);
            _JsVex.extract(obj[prop.name], results, basePath + prop.name, maxRecursion, maxLength);
            results.push(prop);
        });
        return results;
    };
    _JsVex.getProps = function (object, score, path) {
        return _.chain(Object.getOwnPropertyNames(object))
            .filter(_JsVex.filter)
            .map(function (name) {
            return { name: name, value: name, path: path, score: score, type: _JsVex.type(object[name]) };
        }).value();
    };
    _JsVex.cache = [];
    return _JsVex;
}());
//# sourceMappingURL=jsvex.js.map