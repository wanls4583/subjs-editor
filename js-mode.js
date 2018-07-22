! function() {
    var Util = {
        insertStr: function(str, index, cont) {
            return str.substring(0, index) + cont + str.substr(index);
        },
        deleteStr: function(str, index, size) {
            if (!size) size = 0;
            return str.substring(0, index) + cont + str.substr(index + size);
        },
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
        sortNum: function(arr) {
            arr.sort(function(arg1, arg2) {
                return Number(arg1) - Number(arg2);
            })
        },
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
        excludeStrReg: function(reg) {
            var res = reg.source;
            return new RegExp('\'[^\']*?' + res + '[^\']*?\'|' + '\"[^\"]*?' + res + '[^\"]*?\"', 'g');
        },
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
        htmlTrans: function(cont) {
            return cont.replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
        reg: /\bdo\b/g,
        className: 'key'
    }, {
        reg: /\belse\b/g,
        className: 'key'
    }, {
        reg: /\bfor\b/g,
        className: 'key'
    }, {
        reg: /\bif\b/g,
        className: 'key'
    }, {
        reg: /\bnew\b/g,
        className: 'key'
    }, {
        reg: /\breturn\b/g,
        className: 'key'
    }, {
        reg: /\bclass\b/g,
        className: 'class'
    }, {
        reg: /\+/g,
        className: 'oprator'
    }, {
        reg: /\-/g,
        className: 'oprator'
    }, {
        reg: /\*/g,
        className: 'oprator'
    }, {
        reg: /\//g,
        className: 'oprator'
    }, {
        reg: /\=/g,
        className: 'oprator'
    }, {
        reg: /\!/g,
        className: 'oprator'
    }, {
        reg: />/g,
        className: 'oprator'
    }, {
        reg: /</g,
        className: 'oprator'
    }, {
        reg: /\&/g,
        className: 'oprator'
    }, {
        reg: /\|/g,
        className: 'oprator'
    }, {
        reg: /\?/g,
        className: 'oprator'
    }, {
        reg: /\:/g,
        className: 'oprator'
    }, {
        reg: /\b\d+\b/g,
        className: 'number'
    }, {
        reg: /\b0[xX][a-zA-Z0-9]*?\b/g,
        className: 'number'
    }, {
        reg: /\bundefined\b/g,
        className: 'number'
    }, {
        reg: /\bnull\b/g,
        className: 'number'
    }, {
        reg: /\bvar\b/g,
        className: 'type'
    }, {
        reg: /\bfunction\b/g,
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
        reg: /\/\/[^\n]*/g,
        className: 'comment'
    }, {
        reg: /'[^']*?'|"[^"]*?"/g,
        className: 'string'
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
    }
    //多行代码高亮
    _proto.pairHighlight = function(startLine) {
        var self = this;
        var checkLines = [startLine];
        _doMatch(startLine);
        //查找多好匹配标识
        function _doMatch(startLine) {
            __exec(true);
            __exec(false);
            //正则匹配
            function __exec(ifPre) {
                for (var regIndex = 0; regIndex < pairRegs.length; regIndex++) {
                    var reg = ifPre ? pairRegs[regIndex].pre : pairRegs[regIndex].suffix,
                        className = pairRegs[regIndex].className,
                        exclude = ifPre ? pairRegs[regIndex].pre_exclude : pairRegs[regIndex].suffix_exclude,
                        str = this.linesContext.getText(startLine);
                    var result = Util.execReg(reg, exclude, str);
                    for (var j = 0; j < result.length; j++) {
                        if (ifPre) {
                            this.preMatchs[startLine - 1] = this.preMatchs[startLine - 1] || {};
                            this.preMatchs[startLine - 1][result[j].start] = this.preMatchs[startLine][result[j].start] || {}；
                            this.preMatchs[startLine - 1][result[j].start][regIndex] = { line: startLine, start: result[j].start, end: result[j].end, regIndex: regIndex, className: className };
                        } else {
                            this.suffixMatchs[startLine - 1] = this.suffixMatchs[startLine - 1] || {};
                            this.suffixMatchs[startLine - 1][result[j].start] = this.suffixMatchs[startLine][result[j].start] || {}；
                            this.suffixMatchs[startLine - 1][result[j].start][regIndex] = { line: startLine, start: result[j].start, end: result[j].end, regIndex: regIndex, className: className };
                        }
                    }
                }
            }
        }
        //检查suffixMatchs
        function _checkSuffixMatchs(startLine) {
            var obj = self.suffixMatchs[startLine - 1];
            if (obj) {
                for (var start in obj) {
                    for (var regIndex in obj[start]) {
                        var preMatch = obj[start][regIndex];
                        //preMatch已被删除
                        if (!self.preMatchs[preMatch.line - 1] ||
                            !self.preMatchs[preMatch.line - 1][preMatch.start] ||
                            !self.preMatchs[preMatch.line - 1][preMatch.start][regIndex]) {
                            _resetMatchLine(preMatch);
                            delete obj[start][regIndex];
                            if (!Util.keys(obj[start]).length) {
                                delete obj[start];
                            }
                        } else if (checkLines.indexOf(preMatch.line) == -1) {
                            checkLines.push(preMatch.line);
                            Util.sortNum(checkLines);
                        }
                    }
                }
            }
        }
        //检查preMatchs
        function _checkPreMatchs(checkLines) {
            for (var i = 0; i < checkLines.length; i++) {
                var startLine = checkLines[i];
                var obj = self.preMatchs[startLine - 1];
                if (!obj) {
                    continue
                }
                for (var start in obj) {
                    for (var regIndex in obj[start]) {
                        var preMatch = obj[start][regIndex];
                        _resetMatchLine(preMatch);
                        preMatch.suffixMatch = __findSuffix(preMatch);
                        _renderMatchLine(preMatch);
                    }
                }
            }
            //寻找匹配的suffix
            function __findSuffix(preMatch) {
                for (var i = preMatch.line; i <= this.linesContext.getLength(); i++) {
                    if (self.suffixMatchs[i] && self.suffixMatchs[i][regIndex]) {
                        var suffixMatch = self.suffixMatchs[i][regIndex];
                        if (!suffixMatch.preMatch || suffixMatch.line > preMatch.line || suffixMatch.start > preMatch.start) {
                            return suffixMatch;
                        }
                    }
                }
            }
        }
        //插入多行匹配修饰
        function _insertDecoration(match) {
            var decoration = self.lineDecorations[match.line - 1];
            for (var i = 0; i < decoration.length; i++) {
                var obj = decoration[i];
                //有交叉则删除
                if (!(obj.end < match.start || obj.start > match.end)) {
                    decoration.splice(i, 1);
                    i--;
                }
            }
            decoration.push(match);
            lineDecoration.sort(function(arg1, arg2) {
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
        function _delDecoration(match) {
            var decoration = self.lineDecorations[match.line - 1];
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
         * @param  {object} preMatch 匹配头
         */
        function _renderMatchLine(preMatch) {
            var endLine = self.linesContext.getLength();
            if (preMatch.suffixMatch) {
                endLine = preMatch.suffixMatch.line - 1;
                if (preMatch.line == preMatch.suffixMatch.line) {
                    _insertDecoration({ start: preMatch.start, end: preMatch.suffixMatch.end });
                    self.renderHTML(preMatch.line);
                } else {
                    _insertDecoration({ start: preMatch.start, end: self.linesContext.getText(preMatch.line).length - 1 });
                    self.renderHTML(preMatch.line);
                    _insertDecoration({ start: 0, end: preMatch.suffixMatch.end });
                    self.renderHTML(preMatch.suffixMatch.line);
                }
            } else {
                _insertDecoration({ start: preMatch.start, end: self.linesContext.getText(preMatch.line).length - 1 });
                self.renderHTML(preMatch.line);
            }
            for (var i = preMatch.line + 1; i <= endLine; i++) {
                self.linesContext.getDom(i).find('.code').html(self.linesContext.getText(i));
                self.linesContext.getDom(i).find('.code').addClass(preMatch.className);
            }
        }
        /**
         * 撤销preMatch挂载的修饰
         * @param  {object} preMatch 匹配头
         */
        function _resetMatchLine(preMatch) {
            var endLine = self.linesContext.getLength();
            if (preMatch.suffixMatch) {
                endLine = preMatch.suffixMatch.line - 1;
                if (preMatch.line == preMatch.suffixMatch.line) {
                    _delDecoration({ start: preMatch.start, end: preMatch.suffixMatch.end });
                    self.renderHTML(preMatch.line);
                } else {
                    _delDecoration({ start: preMatch.start, end: self.linesContext.getText(preMatch.line).length - 1 });
                    self.renderHTML(preMatch.line);
                    _delDecoration({ start: 0, end: preMatch.suffixMatch.end });
                    self.renderHTML(preMatch.suffixMatch.line);
                }
            } else {
                _delDecoration({ start: preMatch.start, end: self.linesContext.getText(preMatch.line).length - 1 });
                self.renderHTML(preMatch.line);
            }
            for (var i = preMatch.line + 1; i <= endLine; i++) {
                self.renderHTML(i);
                self.linesContext.getDom(i).find('.code').removeClass(preMatch.className);
            }
        }
        /**
         * 检查行是否在多行匹配范围内
         * @param  {number} line 行号
         */
        function _checkIfOnPair(line) {
            for (var i = line - 1; i >= 1; i--) {
                var obj = self.preMatchs[i - 1];
                if (!obj) {
                    continue;
                }
                for (var start in obj) {
                    for (var regIndex in obj[start]) {
                        if (!obj[start][regIndex].preMatch || obj[start][regIndex].preMatch.line > line) {
                            self.linesContext.getDom(line).find('.code').html(self.linesContext.getText(line));
                            self.linesContext.getDom(line).find('.code').addClass(obj[start][regIndex].preMatch.className);
                        }
                    }
                }
            }
        }
    }
    /**
     * 挂载带修饰的HTML
     * @param  {number} line 行号
     */
    _proto.renderHTML = function(line) {
        var str = this.linesContext.getText(line);
        var doneRangeOnline = this.linesDecoration[line - 1];
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
            for (var j = doneRangeOnline.length - 1; j >= 0; j--) {
                var obj = doneRangeOnline[j];
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
        for (var i = doneRangeOnline.length - 1; i >= 0; i--) {
            var obj = doneRangeOnline[i];
            str = Util.insertStr(str, obj.end + 1, '</span>');
            str = Util.insertStr(str, obj.start, '<span class="' + obj.className + '">');
        }
        this.linesContext.getDom('.code').html(str);
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
     * @param  {number} line   首行
     * @param  {number} length 插入的行数
     */
    _proto.onInsertContent = function(line, length) {
        if (length > 1) {
            for (var i = 1; i < length; i++) {
                this.preMatchs.splice(line, 0, undefined);
                this.suffixMatchs.splice(line, 0, undefined);
            }
            //重置行号
            for (var i = line + 1; i < this.linesContext.getLength(); i++) {
                var obj = this.preMatchs[i - 1];
                if (obj) {
                    for (var start in obj) {
                        for (var regIndex in obj[start]) {
                            obj.line = i;
                            if (obj.suffixMatch && obj.suffixMatch.line > line) {
                                obj.suffixMatch.line += length - 1;
                            }
                        }
                    }
                }
                var obj = this.suffixMatchs[i - 1];
                if (obj) {
                    for (var start in obj) {
                        for (var regIndex in obj[start]) {
                            obj.line = i;
                            if (obj.preMatch && obj.preMatch.line > line) {
                                obj.preMatch.line += length - 1;
                            }
                        }
                    }
                }
            }
        }
        this.onUpdateLine(line);
    }
    /**
     * 当删除内容时触发多行匹配
     * @param  {number} line   首行
     * @param  {number} length 删除的行数
     */
    _proto.onDeleteContent = function(line, length) {
        var checkLines = [line];
        
    }
    window.SubJsMode = JsMode;
}()