/**
 */
define(function(require) {
    // 用于处理merge时无法遍历Date等对象的问题
    var BUILTIN_OBJECT = {
        '[object Function]': 1,
        '[object RegExp]': 1,
        '[object Date]': 1,
        '[object Error]': 1,
        '[object CanvasGradient]': 1
    };

    var objToString = Object.prototype.toString;

    function isDom(obj) {
        return obj && obj.nodeType === 1
               && typeof(obj.nodeName) == 'string';
    }

    var arrayProto = Array.prototype;
    var nativeForEach = arrayProto.forEach;
    var nativeFilter = arrayProto.filter;
    var nativeMap = arrayProto.map;

    /**
     * @param {*} source
     * @param {boolean} [deep=false]
     * @return {*} 拷贝后的新对象
     */
    function clone(source, deep) {
        if (typeof source == 'object' && source !== null) {
            var result = source;
            if (source instanceof Array) {
                result = [];
                for (var i = 0, len = source.length; i < len; i++) {
                    result[i] = deep ? clone(source[i], deep) : source[i];
                }
            }
            else if (
                !BUILTIN_OBJECT[objToString.call(source)]
                // 是否为 dom 对象
                && !isDom(source)
            ) {
                result = {};
                for (var key in source) {
                    if (source.hasOwnProperty(key)) {
                        result[key] = deep ? clone(source[key], deep) : source[key];
                    }
                }
            }

            return result;
        }

        return source;
    }

    /**
     * @param {*} target
     * @param {*} source
     * @param {boolean} [overwrite=false]
     * @param {boolean} [deep=true]
     */
    function merge(target, source, overwrite, deep) {
        if (typeof deep === 'undefined') {
            deep = true;
        }
        if (! target) {
            return;
        }
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                var targetProp = target[key];
                if (deep
                    && typeof targetProp == 'object'
                    && ! BUILTIN_OBJECT[objToString.call(targetProp)]
                    // 是否为 dom 对象
                    && ! isDom(targetProp)
                ) {
                    // 如果需要递归覆盖，就递归调用merge
                    merge(
                        target[key],
                        source[key],
                        overwrite,
                        deep
                    );
                }
                else if (overwrite || !(key in target)) {
                    // 否则只处理overwrite为true，或者在目标对象中没有此属性的情况
                    // NOTE，在 target[key] 不存在的时候也是直接覆盖
                    target[key] = source[key];
                }
            }
        }

        return target;
    }

    var _ctx;

    function getContext() {
        if (!_ctx) {
            _ctx = document.createElement('canvas').getContext('2d');
        }
        return _ctx;
    }

    /**
     * 查询数组中元素的index
     */
    function indexOf(array, value) {
        if (array.indexOf) {
            return array.indexOf(value);
        }
        for (var i = 0, len = array.length; i < len; i++) {
            if (array[i] === value) {
                return i;
            }
        }
        return -1;
    }

    /**
     * 构造类继承关系
     *
     * @param {Function} clazz 源类
     * @param {Function} baseClazz 基类
     */
    function inherits(clazz, baseClazz) {
        var clazzPrototype = clazz.prototype;
        function F() {}
        F.prototype = baseClazz.prototype;
        clazz.prototype = new F();

        for (var prop in clazzPrototype) {
            clazz.prototype[prop] = clazzPrototype[prop];
        }
        clazz.constructor = clazz;
    }

    function isArrayLike(data) {
        if (! data) {
            return;
        }
        if (typeof data == 'string') {
            return false;
        }
        return typeof data.length == 'number';
    }

    /**
     * 数组或对象遍历
     * @memberOf module:zrender/tool/util
     * @param {Object|Array} obj
     * @param {Function} cb
     * @param {*} [context]
     */
    function each(obj, cb, context) {
        if (!(obj && cb)) {
            return;
        }
        if (obj.forEach && obj.forEach === nativeForEach) {
            obj.forEach(cb, context);
        }
        else if (obj.length === +obj.length) {
            for (var i = 0, len = obj.length; i < len; i++) {
                cb.call(context, obj[i], i, obj);
            }
        }
        else {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cb.call(context, obj[key], key, obj);
                }
            }
        }
    }

    /**
     * 数组映射
     * @memberOf module:zrender/tool/util
     * @param {Array} obj
     * @param {Function} cb
     * @param {*} [context]
     * @return {Array}
     */
    function map(obj, cb, context) {
        if (!(obj && cb)) {
            return;
        }
        if (obj.map && obj.map === nativeMap) {
            return obj.map(cb, context);
        }
        else {
            var result = [];
            for (var i = 0, len = obj.length; i < len; i++) {
                result.push(cb.call(context, obj[i], i, obj));
            }
            return result;
        }
    }

    /**
     * 数组过滤
     * @memberOf module:zrender/tool/util
     * @param {Array} obj
     * @param {Function} cb
     * @param {*} [context]
     * @return {Array}
     */
    function filter(obj, cb, context) {
        if (!(obj && cb)) {
            return;
        }
        if (obj.filter && obj.filter === nativeFilter) {
            return obj.filter(cb, context);
        }
        else {
            var result = [];
            for (var i = 0, len = obj.length; i < len; i++) {
                if (cb.call(context, obj[i], i, obj)) {
                    result.push(obj[i]);
                }
            }
            return result;
        }
    }

    function bind(func, context) {
        return function () {
            return func.apply(context, arguments);
        };
    }

    function isArray(value) {
        return objToString.call(value) === '[object Array]';
    }

    function isObject(value) {
        // Avoid a V8 JIT bug in Chrome 19-20.
        // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
        var type = typeof value;
        return type === 'function' || (!!value && type == 'object');
    }

    return {
        inherits: inherits,
        clone: clone,
        merge: merge,
        getContext: getContext,
        indexOf: indexOf,
        isArrayLike: isArrayLike,
        each: each,
        map: map,
        filter: filter,
        bind: bind,
        isArray: isArray,
        isObject: isObject
    };
});
