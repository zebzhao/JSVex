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
            return value.charCodeAt(0) != 95 && value.toUpperCase() != value && value != "constructor" && value.indexOf("moz") == -1;
        else
            return value.charCodeAt(0) == 95;
    };
    _JsVex.extractClassHierarchy = function (obj, results) {
        _.each(_JsVex.getProps(obj, ""), function (prop) {
            var value = obj[prop.name];
            if (value.prototype) {
                if (Object.getPrototypeOf(value.prototype)) {
                    var proto = Object.getPrototypeOf(value.prototype).constructor.toString();
                    results[prop.name] = proto.slice(9, proto.indexOf('('));
                }
                else {
                    results[prop.name] = null;
                }
            }
        });
    };
    _JsVex.extractClasses = function (obj, results, path, maxRecursion, maxLength, add) {
        if (maxRecursion <= 0 ||
            obj === undefined ||
            obj === null ||
            results.length > maxLength ||
            _JsVex.cache.indexOf(_JsVex.type(obj)) != -1 // object type already cached
        ) {
            // Exit recursion
            return results;
        }
        // Decrease number of available recursions
        maxRecursion--;
        _.each(_JsVex.getProps(obj, path), function (prop) {
            var value;
            try {
                value = obj[prop.name];
            }
            catch (e) {
                return;
            }
            if (value && value.prototype) {
                _JsVex.extractClasses(value.prototype, results, prop.name, maxRecursion, maxLength, true);
                if (_JsVex.cache.indexOf(prop.name) == -1)
                    _JsVex.cache.push(prop.name);
            }
            _JsVex.extractClasses(value, results, path + "." + prop.name, maxRecursion, maxLength, false);
            if (add)
                results.push(prop);
        });
    };
    _JsVex.getArgs = function (fun) {
        if (_JsVex.type(fun) == "Function")
            return fun.toString().match(/^[\s\(]*function[^(]*(\([^)]*\))/)[1];
    };
    _JsVex.getProps = function (object, path) {
        var props = Object.getOwnPropertyNames(object);
        return _.chain(props)
            .filter(_JsVex.filter)
            .map(function (name) {
            try {
                return { name: name, path: path, type: _JsVex.type(object[name]) };
            }
            catch (e) {
                return { name: name, path: path };
            }
        }).value();
    };
    _JsVex.cache = [];
    return _JsVex;
}());
//# sourceMappingURL=jsvex.js.map