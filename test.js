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
        },
        //<,>转义
        htmlTrans: function(cont) {
            return cont.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        },
        copyObj: function(obj) {
            if (typeof obj == 'object') {
                return JSON.parse(JSON.stringify(obj));
            }
        }
    }
    //多行匹配 ie. /*....*/
    var pairRegs = [{
        pre: /\/\*/g,
        pre_exclude: [Util.excludeStrReg(/\/\*/), /\*\/\*/g],
        suffix: /\*\//g,
        suffix_exclude: Util.excludeStrReg(/\*\//),
        className: 'pair_comment'
    }]
    //单行匹配
    var regs = [{
        reg: /\bcontinue\b/g,
        className: 'key'
    }, {
        reg: /\bdo\b|\belse\b|\bfor\b|\bif\b|\bnew\b|\breturn\b/g,
        className: 'key'
    }, {
        reg: /\bclass\b/g,
        className: 'class'
    }, {
        reg: /\+|\-|\*|\/|\=|\!|>|<|\&|\||\?|/g,
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
    /**
     * JS 语法高亮
     * @param {LinesContext} linesContext [行对应的内容]
     */
    function JsMode(linesContext) {
        this.linesContext = linesContext;
        this.preMatchs = []; //多行匹配开始记录
        this.suffixMatchs = []; //多行匹配结束记录
        this.lineDecorations = []; //行对应的修饰
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
        this.lineDecorations[currentLine - 1] = lineDecoration;
        this.renderHTML(currentLine);
    }
    //多行代码高亮
    _proto.pairHighlight = function(startLine) {
        var self = this,
            copyNowPreMatch = this.preMatchs[startLine - 1],
            copyNowSuffixMatch = this.suffixMatchs[startLine - 1];
        _resetMatch(startLine);
        _doMatch(startLine);
        _checkSuffixMatchs(startLine);
        _checkPreMatchs(startLine);
        _checkIfOnPair(startLine);
        //撤销修饰
        function _resetMatch(startLine) {
            var obj = self.suffixMatchs[startLine - 1];
            if (obj) {
                for (var start in obj) {
                    for (var regIndex in obj[start]) {
                        var suffixMatch = obj[start][regIndex];
                        if (suffixMatch.preMatch) {
                            self.resetMatchLine(suffixMatch.preMatch);
                        }
                    }
                }
            }
            var obj = self.preMatchs[startLine - 1];
            if (obj) {
                for (var start in obj) {
                    for (var regIndex in obj[start]) {
                        var preMatch = obj[start][regIndex];
                        self.resetMatchLine(preMatch);
                    }
                }
            }
        }
        //查找多好匹配标识
        function _doMatch(startLine) {
            self.preMatchs[startLine - 1] = undefined;
            self.suffixMatchs[startLine - 1] = undefined;
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
                            self.preMatchs[startLine - 1] = self.preMatchs[startLine - 1] || {};
                            self.preMatchs[startLine - 1][result[j].start] = self.preMatchs[startLine - 1][result[j].start] || {};
                            self.preMatchs[startLine - 1][result[j].start][regIndex] = { line: startLine, start: result[j].start, end: result[j].end, regIndex: regIndex, className: className };
                        } else {
                            self.suffixMatchs[startLine - 1] = self.suffixMatchs[startLine - 1] || {};
                            self.suffixMatchs[startLine - 1][result[j].start] = self.suffixMatchs[startLine - 1][result[j].start] || {};
                            self.suffixMatchs[startLine - 1][result[j].start][regIndex] = { line: startLine, start: result[j].start, end: result[j].end, regIndex: regIndex, className: className };
                        }
                    }
                }
            }
        }
        //检查suffixMatchs并渲染修饰
        function _checkSuffixMatchs(startLine) {
            var obj = self.suffixMatchs[startLine - 1];
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
                            console.log(preMatch);
                            self.pairHighlight(preMatch.line);
                        }
                    }
                }
            }
            //检查suffixMatch是否被删除，如果删除了，需要重新配对之前与之配对的preMatch
            for (var start in copyNowSuffixMatch) {
                for (var regIndex in copyNowSuffixMatch[start]) {
                    var suffixMatch = copyNowSuffixMatch[start][regIndex];
                    if (!obj || !obj[start] || !obj[start][regIndex]) {
                        var preSuffxiMatch = _findPreSuffix(suffixMatch);
                        var preMatch = _findPre(suffixMatch, preSuffxiMatch && preSuffxiMatch.line);
                        if (startLine != preMatch.line) {
                            _checkPreMatchs(preMatch.line);
                        }
                    }
                }
            }
        }
        //检查preMatchs并渲染修饰
        function _checkPreMatchs(startLine) {
            var obj = self.preMatchs[startLine - 1];
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
            for (var i = startLine || 1; i <= suffixMatch.line; i++) {
                var obj = self.preMatchs[i - 1];
                if (obj) {
                    var cols = Util.keys(obj);
                    Util.sortNum(cols);
                    for (var j = 0; j < cols.length; j++) {
                        var preMatch = obj[cols[j]][suffixMatch.regIndex];
                        if (preMatch &&
                            (preMatch.line < suffixMatch.line ||
                                preMatch.line == suffixMatch.line && preMatch.start < suffixMatch.start) &&
                            (!preMatch.suffixMatch ||
                                preMatch.suffixMatch.line > suffixMatch.line ||
                                preMatch.suffixMatch.line == suffixMatch.line && preMatch.suffixMatch.start > suffixMatch.start)) {
                            self.resetMatchLine(preMatch);
                            return preMatch;
                        }
                    }
                }
            }
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
            var endLine = self.linesContext.getLength();
            if (oldSuffix) {
                endLine = oldSuffix.line;
            }
            for (var i = nowMatch.line; i <= endLine; i++) {
                var obj = self.preMatchs[i - 1];
                if (obj) {
                    var cols = Util.keys(obj);
                    Util.sortNum(cols);
                    for (var j = 0; j < cols.length; j++) {
                        var preMatch = obj[cols[j]][nowMatch.regIndex];
                        if (preMatch &&
                            (preMatch.line > nowMatch.line ||
                                preMatch.line == nowMatch.line && preMatch.start > nowMatch.start) &&
                            (!oldSuffix || preMatch.line < oldSuffix.line ||
                                preMatch.line == oldSuffix.line && preMatch.start < oldSuffix.start)) {
                            return preMatch;
                        }
                    }
                }
            }
        }
        /**
         * 寻找后面能与当前preMatch匹配的suffixMatchh
         * @param  {Object} preMatch 匹配头对象
         * @return {Object}          匹配尾对象
         */
        function _findSuffix(preMatch) {
            for (var i = preMatch.line; i <= self.linesContext.getLength(); i++) {
                var obj = self.suffixMatchs[i - 1];
                if (obj) {
                    var cols = Util.keys(obj);
                    Util.sortNum(cols);
                    for (var j = 0; j < cols.length; j++) {
                        var suffixMatch = obj[cols[j]][preMatch.regIndex];
                        if (suffixMatch && (suffixMatch.line > preMatch.line ||
                                suffixMatch.line == preMatch.line && suffixMatch.start > preMatch.start)) {
                            if (!suffixMatch.preMatch ||
                                suffixMatch.preMatch.line > preMatch.line ||
                                suffixMatch.preMatch.line == preMatch.line && suffixMatch.preMatch.start > preMatch.start) {
                                if (suffixMatch.preMatch) {
                                    self.resetMatchLine(suffixMatch.preMatch);
                                }
                                return suffixMatch;
                            }
                            preMatch.hasAfterSuffix = true;
                            return;
                        }
                    }
                    preMatch.hasAfterSuffix = false;
                }
            }
        }
        /*
        寻找前一个suffixMatch（从该suffixMatch之后的位置开始寻找preMatch）
        preMatch...
        preSuffixMatch...
        preMatch...
        nowSuffixMatch
         */
        function _findPreSuffix(suffixMatch) {
            for (var i = suffixMatch.line; i >= 1; i--) {
                var obj = self.suffixMatchs[i - 1];
                if (obj) {
                    var cols = Util.keys(obj);
                    Util.sortNum(cols);
                    for (var j = cols.length - 1; j >= 0; j--) {
                        var _suffixMatch = obj[cols[j]][suffixMatch.regIndex];
                        if (_suffixMatch.line < suffixMatch.line ||
                            _suffixMatch.line == suffixMatch.line && _suffixMatch.start < suffixMatch.start) {
                            return _suffixMatch;
                        }
                    }
                }
            }
        }
        /**
         * 检查行是否在多行匹配范围内
         * @param  {Number} line 行号
         */
        function _checkIfOnPair(line) {
            for (var i = line - 1; i >= 1; i--) {
                var obj = self.preMatchs[i - 1];
                if (!obj) {
                    continue;
                }
                for (var start in obj) {
                    for (var regIndex in obj[start]) {
                        if (!obj[start][regIndex].suffixMatch && self.endMatch == obj[start][regIndex] ||
                            obj[start][regIndex].suffixMatch && obj[start][regIndex].suffixMatch.line > line) {
                            self.linesContext.getDom(line).find('.code').html(Util.htmlTrans(self.linesContext.getText(line)));
                            self.linesContext.getDom(line).find('.code').addClass(obj[start][regIndex].className);
                            break;
                        }
                    }
                }
            }
        }
    }
    //插入多行匹配修饰
    _proto.insertDecoration = function(match) {
        var decoration = this.lineDecorations[match.line - 1];
        if (!decoration) {
            decoration = this.lineDecorations[match.line - 1] = {};
        }
        for (var i = 0; i < decoration.length; i++) {
            var obj = decoration[i];
            //有交叉则删除
            if (!(obj.end < match.start || obj.start > match.end)) {
                decoration.splice(i, 1);
                i--;
            }
        }
        decoration.push(match);
        decoration.sort(function(arg1, arg2) {
            if (arg1.start < arg2.start) {
                return -1
            } else if (arg1.start == arg2.start) {
                return 0;
            } else {
                return 1;
            }
        });
    }
    //删除多行修饰
    _proto.delDecoration = function(match) {
        var decoration = this.lineDecorations[match.line - 1];
        for (var i = 0; i < decoration.length; i++) {
            var obj = decoration[i];
            if (match.start == obj.start && match.end == obj.end) {
                decoration.splice(i, 1);
                return;
            }
        }
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
                self.renderHTML(preMatch.line);
            } else {
                self.insertDecoration({ line: preMatch.line, start: preMatch.start, end: self.linesContext.getText(preMatch.line).length - 1, className: preMatch.className });
                self.renderHTML(preMatch.line);
                self.insertDecoration({ line: preMatch.suffixMatch.line, start: 0, end: preMatch.suffixMatch.end, className: preMatch.className });
                self.renderHTML(preMatch.suffixMatch.line);
            }
            __addWholeLineDec();
        } else if (!preMatch.hasAfterSuffix &&
            (!self.endMatch ||
                preMatch.line < self.endMatch.line ||
                preMatch.line == self.endMatch.line && preMatch.start < self.endMatch.start)) {
            self.insertDecoration({ line: preMatch.line, start: preMatch.start, end: self.linesContext.getText(preMatch.line).length - 1, className: preMatch.className });
            self.renderHTML(preMatch.line);
            self.endMatch = preMatch;
            __addWholeLineDec();
        }
        //添加整行修饰
        function __addWholeLineDec() {
            for (var i = preMatch.line + 1; i <= endLine; i++) {
                self.linesContext.getDom(i).find('.code').html(Util.htmlTrans(self.linesContext.getText(i)));
                self.linesContext.getDom(i).find('.code').addClass(preMatch.className);
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
                self.renderHTML(preMatch.line);
            } else {
                self.delDecoration({ line: preMatch.line, start: preMatch.start, end: self.linesContext.getText(preMatch.line).length - 1 });
                self.renderHTML(preMatch.line);
                self.delDecoration({ line: preMatch.suffixMatch.line, start: 0, end: preMatch.suffixMatch.end });
                self.renderHTML(preMatch.suffixMatch.line);
            }
            __delWholeLineDec();
        } else if (self.endMatch == preMatch) {
            self.delDecoration({ line: preMatch.line, start: preMatch.start, end: self.linesContext.getText(preMatch.line).length - 1 });
            self.renderHTML(preMatch.line);
            self.endMatch = undefined;
            __delWholeLineDec();
        }
        if (preMatch.suffixMatch) {
            preMatch.suffixMatch.preMatch = undefined;
            preMatch.suffixMatch = undefined;
        }
        //删除整行修饰
        function __delWholeLineDec() {
            for (var i = preMatch.line + 1; i <= endLine; i++) {
                self.renderHTML(i);
                self.linesContext.getDom(i).find('.code').removeClass(preMatch.className);
            }
        }
    }
    /**
     * 挂载带修饰的HTML
     * @param  {Number} line 行号
     */
    _proto.renderHTML = function(line) {
        var str = this.linesContext.getText(line);
        var decRangeOnline = this.lineDecorations[line - 1];
        if (!decRangeOnline) {
            return;
        }
        var copyDec = Util.copyObj(decRangeOnline);

        //处理HTML转义'>,<'--'&gt;,&lt;'
        var reg = />|</g,
            match = null,
            indexs = [];
        while (match = reg.exec(str)) {
            indexs.push(match.index);
        }
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
        str = Util.htmlTrans(str);
        //生成HTML
        for (var i = copyDec.length - 1; i >= 0; i--) {
            var obj = copyDec[i];
            str = Util.insertStr(str, obj.end + 1, '</span>');
            str = Util.insertStr(str, obj.start, '<span class="' + obj.className + '">');
        }
        this.linesContext.getDom(line).find('.code').html(str);
    }
    /**
     * 重置match对象行号（新增行或删除行后）
     * @param  {Number} startLine 需要开始重置行号的首页
     */
    _proto.resetLineNum = function(startLine) {
        //重置行号
        for (var i = startLine; i < this.linesContext.getLength(); i++) {
            var obj = this.preMatchs[i - 1];
            for (var start in obj) {
                for (var regIndex in obj[start]) {
                    obj[start][regIndex].line = i;
                }
            }
            var obj = this.suffixMatchs[i - 1];
            for (var start in obj) {
                for (var regIndex in obj[start]) {
                    obj[start][regIndex].line = i;
                }
            }
        }
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
        if (length > 1) {
            for (var i = 1; i < length; i++) {
                this.preMatchs.splice(line, 0, undefined);
                this.suffixMatchs.splice(line, 0, undefined);
                this.lineDecorations.splice(line, 0, undefined);
            }
            this.resetLineNum(line);
        }
        for (var i = line; i < line + length; i++) {
            this.onUpdateLine(i);
        }
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
            for (var i = 1; i < length; i++) {
                this.preMatchs.splice(line, 1);
                this.suffixMatchs.splice(line, 1);
                this.lineDecorations.splice(line, 1);
            }
            this.resetLineNum(line);
            for (var i = 0; i < matchs.length; i++) {
                var match = matchs[i];
                !match.del && lines.push(match.line);
                if(match.preMatch || match.del){
                    match = match.del ? match : match.preMatch;
                    //删除preMatch后面的修饰
                    match.line = line;
                    match.start = -1;
                    self.resetMatchLine(match);
                }
            }
        }

        for (var i = 0; i < lines.length; i++) {
            this.onUpdateLine(lines[i]);
        }

        //查找需要重新检查代码高亮的行（删除区域的多行匹配符可能影响删除区域外的行）
        function _findReCheckLines(startLine, endLine) {
            var matchs = [];
            for (var i = startLine; i <= endLine; i++) {
                var obj = self.preMatchs[i - 1];
                for (var start in obj) {
                    for (var regIndex in obj[start]) {
                        var match = obj[start][regIndex];
                        if (match.suffixMatch && match.suffixMatch.line > endLine) {
                            matchs.push(match.suffixMatch);
                        }else if(!match.suffixMatch){
                            //需要删除preMatch后的修饰
                            match.del = true;
                            matchs.push(match);
                        }
                    }
                }
                var obj = self.suffixMatchs[i - 1];
                for (var start in obj) {
                    for (var regIndex in obj[start]) {
                        var match = obj[start][regIndex];
                        if (match.preMatch && match.preMatch.line < startLine) {
                            match.preMatch.suffixMatch = undefined;
                            matchs.push(match.preMatch);
                        }
                    }
                }
            }
            return matchs;
        }
    }
    window.SubJsMode = JsMode;
}()