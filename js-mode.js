! function() {
    var Util = {
        /**
         * 在字符串指定位置插入新的内容
         * @param  {String} str   原字符串
         * @param  {Number} index 插入的位置
         * @param  {String} cont  插入的内容
         * @return {String}       处理后的内容
         */
        insertStr: function(str, index, cont) {
            return str.substring(0, index) + cont + str.substr(index);
        },
        //兼容Object.keys
        keys: function(obj) {
            if (Object.keys) {
                return Object.keys(obj);
            } else {
                var arr = [];
                for (var key in obj) {
                    arr.push(key);
                }
                return arr;
            }
        },
        //使用数字排序（数组默认以字符排序）
        sortNum: function(arr) {
            arr.sort(function(arg1, arg2) {
                return Number(arg1) - Number(arg2);
            })
        },
        //<,>转义
        htmlTrans: function(cont) {
            return cont.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        },
        //克隆对象
        copyObj: function(obj) {
            if (typeof obj == 'object') {
                return JSON.parse(JSON.stringify(obj));
            }
        },
        /**
         * 以key的数字排序顺序处理对象的每一项
         * @param  {Objec} obj 待处理的U对象
         * @param  {Function} callback 处理函数
         * @param  {Number}   starKey  开始位置
         * @param  {Number}   endKey   结束位置
         * @param  {Boolean}  reverse  是否从大到小处理
         */
        eachByKeyOrder: function(obj, callback, starKey, endKey, reverse) {
            var keys = this.keys(obj);
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
        },
        /**
         * 匹配正则
         * @param  {RegExp}   reg      匹配的正则
         * @param  {RegExp}   exclude  需要排除的正则
         * @param  {String}   str      待匹配的字符串
         * @param  {Function} callback 二次处理回调（防止正则太复杂，使用二次处理）
         * @return {Array}             结果数组：[{start:start,end:end}]
         */
        execReg: function(reg, exclude, str, callback) {
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
        },
        /**
         * 生成正则表达式，用来排除字符串中的正则
         * @param  {RegExp} reg 正则对象
         * @return {RegExp}     正则对象
         */
        excludeStrReg: function(reg) {
            var res = reg.source;
            return new RegExp('\'[^\']*?' + res + '[^\']*?\'|' + '\"[^\"]*?' + res + '[^\"]*?\"', 'g');
        },
        /**
         * 处理函数的参数列表
         * @param  {String} str   包含参数的字符串
         * @param  {Number} start 参数开始的索引
         * @param  {Number} end   参数结束的索引
         */
        execArgsReg: function(str, start, end) {
            str = str.substring(start, end + 1);
            var args = str.split(','),
                suc = true,
                varReg = /\s*?([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*(?:,|$)/g,
                result = [];
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
    //多行匹配 ie. /*....*/
    var pairRegs = [{
        pre: /\/\*/g,
        pre_exclude: [Util.excludeStrReg(/\/\*/), /\*\/\*/g, /\/\/[^\n]*/g],
        suffix: /\*\//g,
        suffix_exclude: [Util.excludeStrReg(/\*\//), /\/\/[^\n]*/g],
        className: 'pair_comment'
    }]
    //单行匹配
    var regs = [{
        reg: /\bcontinue\b|\bdo\b|\belse\b|\bfor\b|\bif\b|\bnew\b|\breturn\b/g,
        className: 'key'
    }, {
        reg: /\bclass\b/g,
        className: 'class'
    }, {
        reg: /\+|\-|\*|\/|\=|\!|>|<|\&|\||\?/g,
        className: 'oprator'
    }, {
        reg: /\b\d+\b|\b0[xX][a-zA-Z0-9]*?\b|\bundefined\b|\bnull\b/g,
        className: 'number'
    }, {
        reg: /\bvar\b|\bfunction\b/g,
        className: 'type'
    }, {
        reg: /[.]?([\$_a-zA-Z][\$_a-zA-Z0-9]*?)(?=\()/g, //ie. test(),.test()
        className: 'function'
    }, {
        reg: /function\s*?([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?(?=\()/g, //ie. function test()
        className: 'function_name'
    }, {
        reg: /([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?:\s*?function\s*?(?=\()/g, //ie. fun:function()
        className: 'function_name'
    }, {
        reg: /([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?(?==\s*?function\()/g, //ie. var test = function()
        className: 'function_name'
    }, {
        reg: /function\s*?\(([\s\S]+?)\)|\bthis\b|\bself\b/g, //ie. function(arg1,arg2)
        className: 'function_arg',
        callback: Util.execArgsReg
    }, {
        reg: /function\s*?[\$_a-zA-Z][\$_a-zA-Z0-9]*?\s*?\(([\s\S]+?)\)/g, //ie. function test(arg1,arg2)
        className: 'function_arg',
        callback: Util.execArgsReg
    }, {
        reg: /'[^']*?'|"[^"]*?"/g,
        className: 'string'
    }, {
        reg: /\/\/[^\n]*/g,
        exclude: Util.excludeStrReg(/\/\//),
        className: 'comment'
    }]

    function Processor(mode, linesContext) {
        var _mode = mode;
        var _linesContext = linesContext;
        var _processQue = []; //带处理行队列
        var timer = null;
        _processQue.hashMap = {};
        this.process = function() {
            var startTime = endTime = new Date().getTime(),
                self = this;
            clearTimeout(timer);
            while (_processQue.length && endTime - startTime <= 17) {
                mode.onUpdateLine(this.pop());
                endTime = new Date().getTime();
            }
            if (_processQue.length) {
                timer = setTimeout(function() {
                    self.process();
                }, 0);
            }
        }

        this.push = function(line) {
            if (!_processQue.hashMap[line]) {
                _processQue.push(line);
                _processQue.hashMap[line] = true;
            }
        }
        this.pop = function() {
            if (_processQue.length) {
                var line = _processQue.pop();
                delete _processQue.hashMap[line];
                return line;
            }
        }
        this.del = function(index) {
            if (_processQue[index]) {
                delete _processQue.hashMap[_processQue[index]];
                _processQue.splice(index, 1);
            }
        }
        this.get = function(index) {
            return _processQue[index];
        }
        this.getLength = function() {
            return _processQue.length;
        }
    }
    /**
     * JS 语法高亮
     * @param {LinesContext} linesContext [行对应的内容]
     */
    function JsMode(linesContext) {
        this.linesContext = linesContext;
        this.preMatchs = {}; //多行匹配开始记录
        this.suffixMatchs = {}; //多行匹配结束记录
        this.processor = new Processor(this, linesContext); //待处理队列
        linesContext.setDecEngine(decEngine); //设置修饰对象的处理引擎
    }
    var _proto = JsMode.prototype;
    //单行代码高亮
    _proto.highlight = function(currentLine) {
        var self = this;
        var lineDecoration = []; //一行中已处理过的区域
        //单行匹配
        for (var i = 0; i < regs.length; i++) {
            var reg = regs[i].reg,
                className = regs[i].className,
                exclude = regs[i].exclude,
                callback = regs[i].callback,
                str = this.linesContext.getText(currentLine);
            var result = Util.execReg(reg, exclude, str, callback);
            for (var j = 0; j < result.length; j++) {
                result[j].className = className;
            }
            //检查是否和之前的修饰有交叉，有则覆盖
            for (var j = 0; j < result.length; j++) {
                var obj = result[j];
                for (var m = 0; m < lineDecoration.length; m++) {
                    if (!(obj.start > lineDecoration[m].end || obj.end < lineDecoration[m].start)) {
                        lineDecoration.splice(m, 1);
                        m--;
                    }
                }
            }
            lineDecoration = lineDecoration.concat(result);
        }
        lineDecoration.sort(function(arg1, arg2) {
            if (arg1.start < arg2.start) {
                return -1
            } else if (arg1.start == arg2.start) {
                return 0;
            } else {
                return 1;
            }
        });
        this.linesContext.setLineDec(currentLine, lineDecoration);
        this.linesContext.updateDom(currentLine);
    }
    //多行代码高亮
    _proto.pairHighlight = function(startLine) {
        var self = this,
            copyNowPreMatch = this.preMatchs[startLine],
            copyNowSuffixMatch = this.suffixMatchs[startLine];
        _resetMatch(startLine);
        _doMatch(startLine);
        _checkSuffixMatchs(startLine);
        _checkPreMatchs(startLine);
        _checkIfOnPair(startLine);
        //撤销多行修饰
        function _resetMatch(startLine) {
            var obj = self.suffixMatchs[startLine];
            for (var start in obj) {
                for (var regIndex in obj[start]) {
                    var suffixMatch = obj[start][regIndex];
                    if (suffixMatch.preMatch) {
                        self.resetMatchLine(suffixMatch.preMatch);
                    }
                }
            }
            var obj = self.preMatchs[startLine];
            for (var start in obj) {
                for (var regIndex in obj[start]) {
                    var preMatch = obj[start][regIndex];
                    self.resetMatchLine(preMatch);
                }
            }
        }
        //查找多行匹配标识
        function _doMatch(startLine) {
            delete self.preMatchs[startLine]
            delete self.suffixMatchs[startLine];
            __exec(true);
            __exec(false);
            //正则匹配
            function __exec(ifPre) {
                for (var regIndex = 0; regIndex < pairRegs.length; regIndex++) {
                    var reg = ifPre ? pairRegs[regIndex].pre : pairRegs[regIndex].suffix,
                        className = pairRegs[regIndex].className,
                        exclude = ifPre ? pairRegs[regIndex].pre_exclude : pairRegs[regIndex].suffix_exclude,
                        str = self.linesContext.getText(startLine);
                    var result = Util.execReg(reg, exclude, str);
                    for (var j = 0; j < result.length; j++) {
                        if (ifPre) {
                            self.preMatchs[startLine] = self.preMatchs[startLine] || {};
                            self.preMatchs[startLine][result[j].start] = self.preMatchs[startLine][result[j].start] || {};
                            self.preMatchs[startLine][result[j].start][regIndex] = { line: startLine, start: result[j].start, end: result[j].end, regIndex: regIndex, className: className };
                        } else {
                            self.suffixMatchs[startLine] = self.suffixMatchs[startLine] || {};
                            self.suffixMatchs[startLine][result[j].start] = self.suffixMatchs[startLine][result[j].start] || {};
                            self.suffixMatchs[startLine][result[j].start][regIndex] = { line: startLine, start: result[j].start, end: result[j].end, regIndex: regIndex, className: className };
                        }
                    }
                }
            }
        }
        //检查suffixMatchs并渲染修饰
        function _checkSuffixMatchs(startLine) {
            var obj = self.suffixMatchs[startLine];
            for (var start in obj) {
                for (var regIndex in obj[start]) {
                    var suffixMatch = obj[start][regIndex];
                    var preSuffxiMatch = _findPreSuffix(suffixMatch);
                    suffixMatch.preMatch = _findPre(suffixMatch, preSuffxiMatch && preSuffxiMatch.line);
                    if (suffixMatch.preMatch) {
                        var oldSuffix = suffixMatch.preMatch.suffixMatch;
                        suffixMatch.preMatch.suffixMatch = suffixMatch;
                        self.renderMatchLine(suffixMatch.preMatch);
                        var preMatch = _findNextPre(suffixMatch, oldSuffix);
                        if (oldSuffix) {
                            oldSuffix.preMatch = undefined;
                        }
                        if (preMatch) {
                            self.pairHighlight(preMatch.line);
                        }
                    }
                }
            }
            //检查suffixMatch是否被删除，如果删除了，需要重新配对之前与之配对的preMatch
            for (var start in copyNowSuffixMatch) {
                for (var regIndex in copyNowSuffixMatch[start]) {
                    var suffixMatch = copyNowSuffixMatch[start][regIndex];
                    if (suffixMatch.line != startLine) {
                        break;
                    }
                    if (!obj || !obj[start] || !obj[start][regIndex]) {
                        var preSuffxiMatch = _findPreSuffix(suffixMatch);
                        var preMatch = _findPre(suffixMatch, preSuffxiMatch && preSuffxiMatch.line);
                        if (preMatch && startLine != preMatch.line) {
                            _checkPreMatchs(preMatch.line);
                        }
                    }
                }
            }
        }
        //检查preMatchs并渲染修饰
        function _checkPreMatchs(startLine) {
            var obj = self.preMatchs[startLine];
            for (var start in obj) {
                for (var regIndex in obj[start]) {
                    var preMatch = obj[start][regIndex];
                    if (!preMatch.suffixMatch) {
                        preMatch.suffixMatch = _findSuffix(preMatch);
                        if (preMatch.suffixMatch) {
                            preMatch.suffixMatch.preMatch = preMatch;
                        }
                        self.renderMatchLine(preMatch);
                    }
                }
            }
            //检查是否删除了匹配头，如果删除了匹配头，需要检查其后的最近的一个匹配头是否有望匹配
            for (var start in copyNowPreMatch) {
                for (var regIndex in copyNowPreMatch[start]) {
                    var preMatch = copyNowPreMatch[start][regIndex];
                    if (preMatch.line != startLine) {
                        break;
                    }
                    if (!obj || !obj[start] || !obj[start][regIndex]) {
                        var nextPre = _findNextPre(preMatch, preMatch.suffixMatch);
                        if (nextPre && nextPre.line != startLine) {
                            _checkPreMatchs(nextPre.line);
                        }
                    }
                }
            }
        }
        /**
         * 寻找前面能与当前suffixMatch匹配的preMatch
         * @param  {Object} suffixMatch 匹配尾
         * @param  {Number} startLine   开始寻找的行
         * @return {Object}             preMatch
         */
        function _findPre(suffixMatch, startLine) {
            var startLine = startLine || 1,
                result = null;
            Util.eachByKeyOrder(self.preMatchs, function(item) {
                var cols = Util.keys(item);
                // Util.sortNum(cols);
                for (var j = 0; j < cols.length; j++) {
                    var preMatch = item[cols[j]][suffixMatch.regIndex];
                    if (preMatch &&
                        (preMatch.line < suffixMatch.line ||
                            preMatch.line == suffixMatch.line && preMatch.start < suffixMatch.start) &&
                        (!preMatch.suffixMatch ||
                            preMatch.suffixMatch.line > suffixMatch.line ||
                            preMatch.suffixMatch.line == suffixMatch.line && preMatch.suffixMatch.start > suffixMatch.start)) {
                        self.resetMatchLine(preMatch);
                        result = preMatch;
                        return true;
                    }
                }
            }, startLine, suffixMatch.line);
            return result;
        }
        /*
        寻找后一个preMatch
        防止出现如下情况：nextPreMatch与oldSuffixMatch/end可以重新配对
        preMatch...
        nowMatch...
        nextPreMatch...
        oldSuffixMatch/end...
        */
        function _findNextPre(nowMatch, oldSuffix) {
            var endLine = self.linesContext.getLength(),
                result = null;
            if (oldSuffix) {
                endLine = oldSuffix.line;
            }
            Util.eachByKeyOrder(self.preMatchs, function(item) {
                if (item) {
                    var cols = Util.keys(item);
                    // Util.sortNum(cols);
                    for (var j = 0; j < cols.length; j++) {
                        var preMatch = item[cols[j]][nowMatch.regIndex];
                        if (preMatch &&
                            (preMatch.line > nowMatch.line ||
                                preMatch.line == nowMatch.line && preMatch.start > nowMatch.start) &&
                            (!oldSuffix || preMatch.line < oldSuffix.line ||
                                preMatch.line == oldSuffix.line && preMatch.start < oldSuffix.start)) {
                            result = preMatch;
                            return true;
                        }
                    }
                }
            }, nowMatch.line, endLine);
            return result;
        }
        /**
         * 寻找后面能与当前preMatch匹配的suffixMatchh
         * @param  {Object} preMatch 匹配头对象
         * @return {Object}          匹配尾对象
         */
        function _findSuffix(preMatch) {
            var result = null;
            Util.eachByKeyOrder(self.suffixMatchs, function(item) {
                var cols = Util.keys(item);
                // Util.sortNum(cols);
                for (var j = 0; j < cols.length; j++) {
                    var suffixMatch = item[cols[j]][preMatch.regIndex];
                    if (suffixMatch && (suffixMatch.line > preMatch.line ||
                            suffixMatch.line == preMatch.line && suffixMatch.start > preMatch.start)) {
                        if (!suffixMatch.preMatch ||
                            suffixMatch.preMatch.line > preMatch.line ||
                            suffixMatch.preMatch.line == preMatch.line && suffixMatch.preMatch.start > preMatch.start) {
                            if (suffixMatch.preMatch) {
                                self.resetMatchLine(suffixMatch.preMatch);
                            }
                            result = suffixMatch;
                        }
                        preMatch.hasAfterSuffix = true;
                        return true;
                    }
                }
                preMatch.hasAfterSuffix = false;
            }, preMatch.line, self.linesContext.getLength());
            return result;
        }
        /*
        寻找前一个suffixMatch（从该suffixMatch之后的位置开始寻找preMatch）
        preMatch...
        preSuffixMatch...
        preMatch...
        nowSuffixMatch
         */
        function _findPreSuffix(suffixMatch) {
            Util.eachByKeyOrder(self.suffixMatchs, function(item) {
                var cols = Util.keys(item);
                // Util.sortNum(cols);
                for (var j = cols.length - 1; j >= 0; j--) {
                    var _suffixMatch = item[cols[j]][suffixMatch.regIndex];
                    if (_suffixMatch &&
                        (_suffixMatch.line < suffixMatch.line ||
                            _suffixMatch.line == suffixMatch.line && _suffixMatch.start < suffixMatch.start)) {
                        return _suffixMatch;
                    }
                }
            }, suffixMatch.line, 1, true);
        }
        /**
         * 检查行是否在多行匹配范围内
         * @param  {Number} line 行号
         */
        function _checkIfOnPair(line) {
            if (line > 1) {
                Util.eachByKeyOrder(self.preMatchs, function(item) {
                    var cols = Util.keys(item);
                    // Util.sortNum(cols);
                    for (var j = cols.length - 1; j >= 0; j--) {
                        var start = cols[j];
                        for (var regIndex in item[start]) {
                            if (!item[start][regIndex].suffixMatch && self.endMatch == item[start][regIndex] ||
                                item[start][regIndex].suffixMatch && item[start][regIndex].suffixMatch.line > line) {
                                self.linesContext.setWhoeLineDec(line, item[start][regIndex].className);
                                self.linesContext.updateDom(line);
                                return true;
                            }
                        }
                    }
                    //最近的一个多行匹配头不匹配后可确定前面也没有匹配头与之匹配了
                    return true;
                }, line - 1, 1, true);
            }
        }
    }
    //插入多行匹配修饰
    _proto.insertDecoration = function(match) {
        this.linesContext.setPriorLineDecs(match.line, match);
    }
    //删除多行修饰
    _proto.delDecoration = function(match) {
        this.linesContext.setPriorLineDecs(match.line, undefined);
    }
    /**
     * 根据preMatch挂载带修饰的HTML
     * @param  {Object} preMatch 匹配头
     */
    _proto.renderMatchLine = function(preMatch) {
        var self = this;
        var endLine = self.linesContext.getLength();
        if (preMatch.suffixMatch) {
            endLine = preMatch.suffixMatch.line - 1;
            if (preMatch.line == preMatch.suffixMatch.line) {
                self.insertDecoration({ line: preMatch.line, start: preMatch.start, end: preMatch.suffixMatch.end, className: preMatch.className });
                self.linesContext.updateDom(preMatch.line);
            } else {
                self.insertDecoration({ line: preMatch.line, start: preMatch.start, end: self.linesContext.getText(preMatch.line).length - 1, className: preMatch.className });
                self.linesContext.updateDom(preMatch.line);
                self.insertDecoration({ line: preMatch.suffixMatch.line, start: 0, end: preMatch.suffixMatch.end, className: preMatch.className });
                self.linesContext.updateDom(preMatch.suffixMatch.line);
            }
            __addWholeLineDec();
        } else if (!preMatch.hasAfterSuffix &&
            (!self.endMatch ||
                preMatch.line < self.endMatch.line ||
                preMatch.line == self.endMatch.line && preMatch.start < self.endMatch.start)) {
            self.insertDecoration({ line: preMatch.line, start: preMatch.start, end: self.linesContext.getText(preMatch.line).length - 1, className: preMatch.className });
            self.linesContext.updateDom(preMatch.line);
            self.endMatch = preMatch;
            __addWholeLineDec();
        }
        //添加整行修饰
        function __addWholeLineDec() {
            for (var i = preMatch.line + 1; i <= endLine; i++) {
                self.linesContext.setWhoeLineDec(i, preMatch.className);
                self.linesContext.updateDom(i);
            }
        }
    }
    /**
     * 撤销preMatch挂载的修饰
     * @param  {Object} preMatch 匹配头
     */
    _proto.resetMatchLine = function(preMatch) {
        var self = this;
        var endLine = (self.endMatch == preMatch && self.linesContext.getLength()) || -1;
        if (preMatch.suffixMatch) {
            endLine = preMatch.suffixMatch.line - 1;
            if (preMatch.line == preMatch.suffixMatch.line) {
                self.delDecoration({ line: preMatch.line, start: preMatch.start, end: preMatch.suffixMatch.end });
                self.linesContext.updateDom(preMatch.line);
            } else {
                self.delDecoration({ line: preMatch.line, start: preMatch.start, end: self.linesContext.getText(preMatch.line).length - 1 });
                self.linesContext.updateDom(preMatch.line);
                self.delDecoration({ line: preMatch.suffixMatch.line, start: 0, end: preMatch.suffixMatch.end });
                self.linesContext.updateDom(preMatch.suffixMatch.line);
            }
            __delWholeLineDec();
        } else if (self.endMatch == preMatch) {
            self.delDecoration({ line: preMatch.line, start: preMatch.start, end: self.linesContext.getText(preMatch.line).length - 1 });
            self.linesContext.updateDom(preMatch.line);
            self.endMatch = undefined;
            __delWholeLineDec();
        }
        if (preMatch.suffixMatch) {
            preMatch.suffixMatch.preMatch = undefined;
            preMatch.suffixMatch = undefined;
            preMatch.hasAfterSuffix = false;
        }
        //删除整行修饰
        function __delWholeLineDec() {
            for (var i = preMatch.line + 1; i <= endLine; i++) {
                self.linesContext.setWhoeLineDec(i, '');
                self.linesContext.updateDom(i);
            }
        }
    }
    /**
     * 重置match对象行号（新增行或删除行后）
     * @param  {Number} startLine 需要开始重置行号的首页
     */
    _proto.resetLineNum = function(startLine) {
        //重置行号
        Util.eachByKeyOrder(this.preMatchs, function(item, line) {
            for (var start in item) {
                for (var regIndex in item[start]) {
                    item[start][regIndex].line = line;
                }
            }
        }, startLine, this.linesContext.getLength());
        //重置行号
        Util.eachByKeyOrder(this.suffixMatchs, function(item, line) {
            for (var start in item) {
                for (var regIndex in item[start]) {
                    item[start][regIndex].line = line;
                }
            }
        }, startLine, this.linesContext.getLength());
    }
    /**
     * 当更新一行时触发
     * @param  {行号} line 行号
     */
    _proto.onUpdateLine = function(line) {
        this.highlight(line);
        this.pairHighlight(line);
    }
    /**
     * 当插入内容时触发
     * @param  {Number} line   首行
     * @param  {Number} length 插入的行数
     */
    _proto.onInsertContent = function(line, length) {
        var self = this;
        if (length > 1) {
            //多行匹配符记录向后移动
            Util.eachByKeyOrder(this.preMatchs, function(item, line) {
                delete self.preMatchs[line];
                self.preMatchs[line + length - 1] = item;
            }, this.linesContext.getLength(), line + 1, true);
            Util.eachByKeyOrder(this.suffixMatchs, function(item, line) {
                delete self.suffixMatchs[line];
                self.suffixMatchs[line + length - 1] = item;
            }, this.linesContext.getLength(), line + 1, true);
            //重置行号
            this.resetLineNum(line + 1);
        }
        var queLength = this.processor.getLength();
        //待处理队列行重置
        for (var i = 0; i < queLength; i++) {
            if (this.processor.get(i) > line) {
                this.processor.get(i) += length - 1;
            }
        }
        //添加到待处理队列
        for (var i = line; i < line + length; i++) {
            this.processor.push(i);
        }
        this.processor.process();
    }
    /**
     * 当删除内容时触发多行匹配
     * @param  {Number} line   首行
     * @param  {Number} length 删除的行数
     */
    _proto.onDeleteContent = function(line, length) {
        var self = this,
            lines = [line];
        if (length > 1) {
            var matchs = _findReCheckLines(line, line + length - 1);
            //删除
            for (var i = line + 1; i < line + length; i++) {
                delete this.preMatchs[i];
                delete this.suffixMatchs[i];
            }
            //多行匹配符记录向前移动
            Util.eachByKeyOrder(this.preMatchs, function(item, line) {
                delete self.preMatchs[line];
                self.preMatchs[line - (length - 1)] = item;
            }, line + length, this.linesContext.getLength());
            Util.eachByKeyOrder(this.suffixMatchs, function(item, line) {
                delete self.suffixMatchs[line];
                self.suffixMatchs[line - (length - 1)] = item;
            }, line + length, this.linesContext.getLength());
            //重置行号
            this.resetLineNum(line + 1);
            for (var i = 0; i < matchs.length; i++) {
                var match = matchs[i];
                !match.del && lines.push(match.line);
                if (match.preMatch || match.del) {
                    match = match.del ? match : match.preMatch;
                    //删除preMatch后面的修饰
                    match.line = line;
                    match.start = -1;
                    self.resetMatchLine(match);
                }
            }
        }
        var queLength = this.processor.getLength();
        //待处理队列行重置
        for (var i = 0; i < queLength; i++) {
            if (this.processor.get(i) > line) {
                this.processor.get(i) -= length - 1;
                this.processor.get(i) < 1 && processQue.del(i), i--;
            }
        }
        //添加到待处理队列
        for (var i = lines.length - 1; i >= 0; i--) {
            this.processor.push(lines[i]);
        }
        this.processor.process();

        //查找需要重新检查代码高亮的行（删除区域的多行匹配符可能影响删除区域外的行）
        function _findReCheckLines(startLine, endLine) {
            var matchs = [];
            Util.eachByKeyOrder(self.preMatchs, function(item) {
                for (var start in item) {
                    for (var regIndex in item[start]) {
                        var match = item[start][regIndex];
                        if (match.suffixMatch && match.suffixMatch.line > endLine) {
                            matchs.push(match.suffixMatch);
                        } else if (!match.suffixMatch) {
                            //需要删除preMatch后的修饰
                            match.del = true;
                            matchs.push(match);
                        }
                        if (match.suffixMatch || match == self.endMatch) {
                            return true;
                        }
                    }
                }
            }, endLine, startLine, true);
            Util.eachByKeyOrder(self.suffixMatchs, function(item) {
                for (var start in item) {
                    for (var regIndex in item[start]) {
                        var match = item[start][regIndex];
                        if (match.preMatch && match.preMatch.line < startLine) {
                            matchs.push(match.preMatch);
                            if (match.line > startLine) {
                                match.preMatch.suffixMatch = undefined;
                            }
                        }
                        if (match.preMatch) {
                            return true;
                        }
                    }
                }
            }, startLine, endLine);
            return matchs;
        }
    }
    /**
     * 修饰引擎，用来处理修饰，生成HTML字符串
     * @param  {String} content 一行内容
     * @param  {Object} lineDec 修饰对象
     * @return {String}         HTML字符串
     */
    function decEngine(content, lineDec, priorLineDec) {
        //处理HTML转义'>,<'--'&gt;,&lt;'
        var reg = />|</g,
            match = null,
            indexs = [],
            copyDec = Util.copyObj(lineDec); //避免原始修饰start被修改
        while (match = reg.exec(content)) {
            indexs.push(match.index);
        }
        //高优先级修饰覆盖(多行匹配的头尾修饰)
        if (priorLineDec && priorLineDec.className) {
            for (var i = 0; i < copyDec.length; i++) {
                var obj = copyDec[i];
                //有交叉则删除
                if (!(obj.end < priorLineDec.start || obj.start > priorLineDec.end)) {
                    copyDec.splice(i, 1);
                    i--;
                }
            }
            copyDec.push(priorLineDec);
            copyDec.sort(function(arg1, arg2) {
                if (arg1.start < arg2.start) {
                    return -1
                } else if (arg1.start == arg2.start) {
                    return 0;
                } else {
                    return 1;
                }
            });
        }
        //避免原始修饰start被修改
        copyDec = Util.copyObj(copyDec);
        //倒序移动位置
        for (var i = indexs.length - 1; i >= 0; i--) {
            var index = indexs[i];
            for (var j = copyDec.length - 1; j >= 0; j--) {
                var obj = copyDec[j];
                if (obj.start > index) {
                    obj.start += 3;
                }
                if (obj.end >= index) {
                    obj.end += 3;
                }
            }
        }
        content = Util.htmlTrans(content);
        //生成HTML
        for (var i = copyDec.length - 1; i >= 0; i--) {
            var obj = copyDec[i];
            content = Util.insertStr(content, obj.end + 1, '</span>');
            content = Util.insertStr(content, obj.start, '<span class="' + obj.className + '">');
        }
        return content;
    }
    window.SubJsMode = JsMode;
}()