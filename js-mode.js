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
                return obj && Object.keys(obj) || [];
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
         * @param  {Array}  keys  关键字数组
         */
        eachByKeyOrder: function(obj, callback, starKey, endKey, reverse, keys) {
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
        token: 'pair_comment'
    }]
    //单行匹配
    var regs = [{
        reg: /\bcontinue\b|\bdo\b|\belse\b|\bfor\b|\bif\b|\bnew\b|\breturn\b/g,
        token: 'key'
    }, {
        reg: /\bclass\b/g,
        token: 'class'
    }, {
        reg: /\+|\-|\*|\/|\=|\!|>|<|\&|\||\?/g,
        token: 'oprator'
    }, {
        reg: /\b\d+\b|\b0[xX][a-zA-Z0-9]*?\b|\bundefined\b|\bnull\b/g,
        token: 'number'
    }, {
        reg: /\bvar\b|\bfunction\b/g,
        token: 'type'
    }, {
        reg: /[.]?([\$_a-zA-Z][\$_a-zA-Z0-9]*?)(?=\()/g, //ie. test(),.test()
        token: 'function'
    }, {
        reg: /function\s*?([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?(?=\()/g, //ie. function test()
        token: 'function_name'
    }, {
        reg: /([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?:\s*?function\s*?(?=\()/g, //ie. fun:function()
        token: 'function_name'
    }, {
        reg: /([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?(?==\s*?function\()/g, //ie. var test = function()
        token: 'function_name'
    }, {
        reg: /function\s*?\(([\s\S]+?)\)|\bthis\b|\bself\b/g, //ie. function(arg1,arg2)
        token: 'function_arg',
        callback: Util.execArgsReg
    }, {
        reg: /function\s*?[\$_a-zA-Z][\$_a-zA-Z0-9]*?\s*?\(([\s\S]+?)\)/g, //ie. function test(arg1,arg2)
        token: 'function_arg',
        callback: Util.execArgsReg
    }, {
        reg: /'[^']*?'|"[^"]*?"/g,
        token: 'string'
    }, {
        reg: /\/\/[^\n]*/g,
        exclude: Util.excludeStrReg(/\/\//),
        token: 'comment'
    }]
    /**
     * 多行匹配节点
     */
    function Node(line, start, end, token, type) {
        this.line = line;
        this.start = start;
        this.end = end;
        this.token = token;
        this.type = type; //1.开始，2.结束
        this.next = null;
        this.prev = null;
        this.preSign = null;
        this.suffixSign = null;
    }
    /**
     * 多行匹配链
     */
    function TokenList {
        //链表头
        this.head = new Node(0);
        //插入一个节点
        this.insert = function(node) {
            var head = this.head;
            while (head.line < node.line || head.start < node.start) {
                if (head.next) {
                    head = head.next;
                } else {
                    break;
                }
            }
            head.next = node;
            node.prev = head;
        }
        //删除节点
        this.del = function(startNode, endNode) {
            if (startNode.prev) {
                startNode.prev.next = endNode.next;
            } else {
                this.head = endNode.next;
            }
        }
    }
    /**
     * 处理器
     * @param {Object} mode         语法高亮对象
     * @param {Object} linesContext 文本容器对象
     */
    function Processor(mode, linesContext) {
        var _processQue = [], //带处理行队列
            timer = null;
        _processQue.hashMap = {}; //纪录待处理行，避免indexOf操作
        //执行
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
        //添加待处理行
        this.push = function(line) {
            if (!_processQue.hashMap[line]) {
                _processQue.push(line);
                //存储值对应的索引
                _processQue.hashMap[line] = _processQue.length - 1;
            }
        }
        //退出最后一个待处理行
        this.pop = function() {
            if (_processQue.length) {
                var line = _processQue.pop();
                delete _processQue.hashMap[line];
                return line;
            }
        }
        //删出一个待处理行
        this.del = function(index) {
            if (_processQue[index]) {
                delete _processQue.hashMap[_processQue[index]];
                _processQue.splice(index, 1);
            }
        }
        //获取待处理行
        this.get = function(index) {
            return _processQue[index];
        }
        //重设待处理行
        this.set = function(index, line) {
            delete _processQue.hashMap[_processQue[index]];
            _processQue.hashMap[line] = index;
            _processQue[index] = line;
        }
        //获取待处理行的数量
        this.getLength = function() {
            return _processQue.length;
        }
        //设置优先处理行
        this.setPriorLine = function(endLine) {
            var index = _processQue.hashMap[endLine];
            if (typeof index != 'undefined') {
                var lines = _processQue.splice(0, index + 1),
                    hashMap = {};
                _processQue = _processQue.concat(lines);
                this.updateHashMap();
            }
        }
        //更新hash
        this.updateHashMap = function() {
            var hashMap = {};
            for (var i = 0, length = _processQue.length; i < length; i++) {
                hashMap[_processQue[i]] = i;
            }
            _processQue.hashMap = hashMap;
        }
    }
    /**
     * JS 语法高亮
     * @param {LinesContext} linesContext [行对应的内容]
     */
    function JsMode(linesContext) {
        this.linesContext = linesContext;
        this.preKeys = []; //存储preSigns关键字列表，提升for in操作速度
        this.preSigns = {}; //多行匹配开始记录
        this.suffixKeys = []; //存储suffixSigns关键字列表
        this.suffixSigns = {}; //多行匹配结束记录
        this.processor = new Processor(this, linesContext); //待处理队列
        this.tokenLists = [];
        linesContext.setDecEngine(decEngine); //设置修饰对象的处理引擎
        for(var i=0; i<pairRegs.length; i++){
            this.tokenLists.push(new TokenList());
        }
    }
    var _proto = JsMode.prototype;
    //单行代码高亮
    _proto.highlight = function(currentLine) {
        var self = this;
        var lineDecoration = []; //一行中已处理过的区域
        //单行匹配
        for (var i = 0; i < regs.length; i++) {
            var reg = regs[i].reg,
                token = regs[i].token,
                exclude = regs[i].exclude,
                callback = regs[i].callback,
                str = this.linesContext.getText(currentLine);
            var result = Util.execReg(reg, exclude, str, callback);
            for (var j = 0; j < result.length; j++) {
                result[j].token = token;
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
        var self = this;

        //查找多行匹配标识
        function _doMatch(startLine) {
            delete self.preSigns[startLine]
            delete self.suffixSigns[startLine];
            __exec(true);
            __exec(false);
            //正则匹配
            function __exec(ifPre) {
                for (var regIndex = 0; regIndex < pairRegs.length; regIndex++) {
                    var reg = ifPre ? pairRegs[regIndex].pre : pairRegs[regIndex].suffix,
                        token = pairRegs[regIndex].token,
                        exclude = ifPre ? pairRegs[regIndex].pre_exclude : pairRegs[regIndex].suffix_exclude,
                        str = self.linesContext.getText(startLine);
                    var result = Util.execReg(reg, exclude, str);
                    for (var j = 0; j < result.length; j++) {
                        var obj = result[j];
                        var node = new Node(startLine, obj.start, obj.end, token, ifPre ? 1 : 2, regIndex);
                        //插入顺序链表
                        tokenList[regIndex].insert(node);
                        if (ifPre) {
                            self.preSigns[startLine] = self.preSigns[startLine] || {};
                            self.preSigns[startLine][result[j].start] = self.preSigns[startLine][result[j].start] || {};
                            self.preSigns[startLine][result[j].start][regIndex] = node;
                        } else {
                            self.suffixSigns[startLine] = self.suffixSigns[startLine] || {};
                            self.suffixSigns[startLine][result[j].start] = self.suffixSigns[startLine][result[j].start] || {};
                            self.suffixSigns[startLine][result[j].start][regIndex] = node;
                        }
                    }
                }
            }
        }

        //符号配对
        function _matchSign(startLine){
            
        }
    }
    /**
     * 根据preSign挂载带修饰的HTML
     * @param  {Object} preSign 匹配头
     */
    _proto.renderToken = function(preSign) {
        var self = this;
        var endLine = self.linesContext.getLength();
        if (preSign.suffixSign) {
            endLine = preSign.suffixSign.line - 1;
            if (preSign.line == preSign.suffixSign.line) {
                self.linesContext.setPriorLineDecs({ line: preSign.line, start: preSign.start, end: preSign.suffixSign.end, className: preSign.className });
                self.linesContext.updateDom(preSign.line);
            } else {
                self.linesContext.setPriorLineDecs({ line: preSign.line, start: preSign.start, end: self.linesContext.getText(preSign.line).length - 1, className: preSign.className });
                self.linesContext.updateDom(preSign.line);
                self.linesContext.setPriorLineDecs({ line: preSign.suffixSign.line, start: 0, end: preSign.suffixSign.end, className: preSign.className });
                self.linesContext.updateDom(preSign.suffixSign.line);
            }
            __addWholeLineDec();
        } else if (!preSign.hasAfterSuffix &&
            (!self.endMatch ||
                preSign.line < self.endMatch.line ||
                preSign.line == self.endMatch.line && preSign.start < self.endMatch.start)) {
            self.linesContext.setPriorLineDecs({ line: preSign.line, start: preSign.start, end: self.linesContext.getText(preSign.line).length - 1, className: preSign.className });
            self.linesContext.updateDom(preSign.line);
            self.endMatch = preSign;
            __addWholeLineDec();
        }
        //添加整行修饰
        function __addWholeLineDec() {
            for (var i = preSign.line + 1; i <= endLine; i++) {
                self.linesContext.setWhoeLineDec(i, preSign.className);
                self.linesContext.updateDom(i);
            }
        }
    }
    /**
     * 撤销preSign挂载的修饰
     * @param  {Object} preSign 匹配头
     */
    _proto.undoToken = function(preSign) {
        var self = this;
        var endLine = (self.endMatch == preSign && self.linesContext.getLength()) || -1;
        if (preSign.suffixSign) {
            endLine = preSign.suffixSign.line - 1;
            if (preSign.line == preSign.suffixSign.line) {
                self.linesContext.setPriorLineDecs({ line: preSign.line, start: preSign.start, end: preSign.suffixSign.end });
                self.linesContext.updateDom(preSign.line);
            } else {
                self.linesContext.setPriorLineDecs({ line: preSign.line, start: preSign.start, end: self.linesContext.getText(preSign.line).length - 1 });
                self.linesContext.updateDom(preSign.line);
                self.linesContext.setPriorLineDecs({ line: preSign.suffixSign.line, start: 0, end: preSign.suffixSign.end });
                self.linesContext.updateDom(preSign.suffixSign.line);
            }
            __delWholeLineDec();
        } else if (self.endMatch == preSign) {
            self.linesContext.setPriorLineDecs({ line: preSign.line, start: preSign.start, end: self.linesContext.getText(preSign.line).length - 1 });
            self.linesContext.updateDom(preSign.line);
            self.endMatch = undefined;
            __delWholeLineDec();
        }
        if (preSign.suffixSign) {
            preSign.suffixSign.preSign = undefined;
            preSign.suffixSign = undefined;
            preSign.hasAfterSuffix = false;
        }
        //删除整行修饰
        function __delWholeLineDec() {
            for (var i = preSign.line + 1; i <= endLine; i++) {
                self.linesContext.setWhoeLineDec(i, '');
                self.linesContext.updateDom(i);
            }
        }
    }
    /**
     * 当更新一行时触发[外部接口]
     * @param  {行号} line 行号
     */
    _proto.onUpdateLine = function(line) {
        this.highlight(line);
        this.pairHighlight(line);
    }
    /**
     * 设置优先处理行[外部接口]
     * @param {Nunber} endLine 优先处理的末行
     */
    _proto.setPriorLine = function(endLine) {
        this.processor.setPriorLine(endLine);
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
        if (priorLineDec && priorLineDec.token) {
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
            content = Util.insertStr(content, obj.start, '<span class="' + obj.token + '">');
        }
        return content;
    }
    window.SubJsMode = JsMode;
}()