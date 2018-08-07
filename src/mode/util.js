class Util{
    /**
     * 在字符串指定位置插入新的内容
     * @param  {String} str   原字符串
     * @param  {Number} index 插入的位置
     * @param  {String} cont  插入的内容
     * @return {String}       处理后的内容
     */
    static insertStr(str, index, cont) {
        return str.substring(0, index) + cont + str.substr(index);
    }
    //兼容Object.keys
    static keys(obj) {
        if (Object.keys) {
            return obj && Object.keys(obj) || [];
        } else {
            var arr = [];
            for (var key in obj) {
                arr.push(key);
            }
            return arr;
        }
    }
    //使用数字排序（数组默认以字符排序）
    static sortNum(arr) {
        arr.sort(function(arg1, arg2) {
            return Number(arg1) - Number(arg2);
        })
    }
    //<,>转义
    static htmlTrans(cont) {
        return cont.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    //克隆对象
    static copyObj(obj) {
        if (typeof obj == 'object') {
            return JSON.parse(JSON.stringify(obj));
        }
    }
    /**
     * 以key的数字排序顺序处理对象的每一项
     * @param  {Objec} obj 待处理的U对象
     * @param  {Function} callback 处理函数
     * @param  {Number}   starKey  开始位置
     * @param  {Number}   endKey   结束位置
     * @param  {Boolean}  reverse  是否从大到小处理
     * @param  {Array}  keys  关键字数组
     */
    static eachByKeyOrder(obj, callback, starKey, endKey, reverse, keys) {
        keys = keys || this.keys(obj);
        // this.sortNum(keys);
        if (!reverse) { //顺序
            for (var i = 0; i < keys.length; i++) {
                var key = Number(keys[i]);
                if (key >= starKey && key <= endKey) {
                    var result = callback(obj[keys[i]], key);
                    if (typeof result == 'boolean') {
                        if (result) {
                            break;
                        } else {
                            continue;
                        }
                    }
                } else if (key > endKey) {
                    break;
                }
            }
        } else { //倒序
            var tmp = starKey;
            starKey = endKey;
            endKey = tmp;
            for (var i = keys.length - 1; i >= 0; i--) {
                var key = Number(keys[i]);
                if (key >= starKey && key <= endKey) {
                    var result = callback(obj[keys[i]], key);
                    if (typeof result == 'boolean') {
                        if (result) {
                            break;
                        } else {
                            continue;
                        }
                    }
                } else if (key < starKey) {
                    break;
                }
            }
        }
    }
    /**
     * 匹配正则
     * @param  {RegExp}   reg      匹配的正则
     * @param  {RegExp}   exclude  需要排除的正则
     * @param  {String}   str      待匹配的字符串
     * @param  {Function} callback 二次处理回调（防止正则太复杂，使用二次处理）
     * @return {Array}             结果数组：[{start:start,end:end}]
     */
    static execReg(reg, exclude, str, callback) {
        var result = [];
        if (reg instanceof Array) {
            for (var j = 0; j < reg.length; j++) {
                result = result.concat(_exec(reg[j], str));
            }
        } else {
            var res = _exec(reg, str);
            var excludeRes = [];
            if (exclude instanceof Array) {
                for (var j = 0; j < exclude.length; j++) {
                    excludeRes = excludeRes.concat(_exec(exclude[j], str));
                }
            } else if (exclude) {
                excludeRes = _exec(exclude, str);
            }
            for (var n = 0; n < excludeRes.length; n++) {
                var start = excludeRes[n].start,
                    end = excludeRes[n].end;
                for (var m = 0; m < res.length; m++) {
                    var tmp = res[m];
                    //两个区域有交叉，或者结果区域不包含exclue区域，则丢弃
                    if (!(start > tmp.end || end < tmp.start) && !(start > tmp.start && end < tmp.end)) {
                        res.splice(m, 1);
                        m--;
                    }
                }
            }
            result = result.concat(res);
        }
        //二次处理
        if (typeof callback == 'function') {
            var tmpArr = [];
            for (var j = 0; j < result.length; j++) {
                var obj = result[j];
                tmpArr = tmpArr.concat(callback(str, obj.start, obj.end));
            }
            result = tmpArr;
        }
        return result;

        function _exec(reg, str) {
            if (!reg.global) {
                throw new Error('reg is not global');
            }
            var match = null;
            var result = [];
            var preIndex = 0;
            while (str && (match = reg.exec(str))) {
                var start, end;
                if (!match[1]) {
                    start = match.index;
                    end = start + match[0].length - 1;
                } else {
                    start = match.index + match[0].indexOf(match[1]);
                    end = start + match[1].length - 1;
                }
                result.push({ start: start, end: end });
            }
            return result;
        }
    }
    /**
     * 生成正则表达式，用来排除字符串中的正则
     * @param  {RegExp} reg 正则对象
     * @return {RegExp}     正则对象
     */
    static excludeStrReg(reg) {
        var res = reg.source;
        return new RegExp('\'[^\']*?' + res + '[^\']*?\'|' + '\"[^\"]*?' + res + '[^\"]*?\"', 'g');
    }
    /**
     * 处理函数的参数列表
     * @param  {String} str   包含参数的字符串
     * @param  {Number} start 参数开始的索引
     * @param  {Number} end   参数结束的索引
     */
    static execArgsReg(str, start, end) {
        str = str.substring(start, end + 1);
        var args = str.split(','),
            suc = true,
            varReg = /\s*?([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*(?:,|$)/g,
            result = [],
            match;
        if (str.match(varReg) && str.match(varReg).length == args.length) {
            while (match = varReg.exec(str)) {
                if (match[1]) {
                    var t = match.index + match[0].indexOf(match[1]) + start;
                    var e = t + match[1].length - 1;
                    result.push({ start: t, end: e });
                }
            }
        }
        return result;
    }
}

export default Util;