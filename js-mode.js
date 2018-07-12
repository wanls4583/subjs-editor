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
        }
	}
	//多行匹配 ie. /*....*/
    var pairReg = [{
        pre: /^(?:[^'"]*?|(?:[^'"]*?(?:'\w*'|"\w*")[^'"]*?)*?)(\/\*)/,
        suffix: /^(?:[^'"]*?|(?:[^'"]*?(?:'\w*'|"\w*")[^'"]*?)*?)(\*\/)/,
        className: 'pair_comment'
    }]
    //单行匹配
    var reg = [/^(?:[^'"]*?|(?:[^'"]*?(?:'\w*'|"\w*")[^'"]*?)*?)(\/\/[^\n]*)/, //单行注释
        /'[\s\S]*?'|"[\s\S]*?"/, //字符串
        /\b(?:break|continue|do|else|for|if|return|while|var|function|new|class)\b/, //关键字
        /\!==|\!=|==|=|\?|\&\&|\&=|\&|\|\||\|=|\||>=|>|<=|<|\+=|\+|\-=|\-|\*=|\*|\/=|\//, //操作符
        /\d+|\b(?:undefined|null)(?:[\b;]|$)/, //数字
        /[.]?([\w]+)(?=\()/, //方法名
    ]
    //单行匹配修饰
    var classNames = ['comment', 'string', 'key', 'oprator', 'number', 'method'];
    /**
     * JS 语法高亮
     * @param {[array]} linesText [行对应的内容]
     * @param {[array]} linesDom  [行对应的dom]
     */
    function JsMode(linesText, linesDom) {
        this.linesText = linesText;
        this.linesDom = linesDom;
        this.donePreReg = []; //多行匹配开始记录
        this.doneSuffixReg = []; //多行匹配结束记录
        this.linesDecoration = []; //行对应的修饰
    }
    var _proto = JsMode.prototype;
    //单行代码高亮
    _proto.highlight = function(currentLine) {
        var self = this;
        var lineDecoration = []; //一行中已处理过的区域
        //单行匹配
        for (var i = 0; i < reg.length; i++) {
            var match = null,
                regObj = reg[i],
                preIndex = 0,
                str = this.linesText[currentLine - 1];
            while (match = regObj.exec(str)) {
                var start, end;
                if (!match[1]) {
                    start = match.index + preIndex;
                    end = start + match[0].length - 1;
                } else {
                    start = match.index + match[0].indexOf(match[1]) + preIndex;
                    end = start + match[1].length - 1;
                }
                var className = classNames[i];
                var ifDo = true;
                for (var tmp = 0; tmp < lineDecoration.length; tmp++) {
                    if (start >= lineDecoration[tmp].start && start <= lineDecoration[tmp].end || end >= lineDecoration[tmp].start && end <= lineDecoration[tmp].end) {
                        ifDo = false;
                    }
                }
                str = str.substr(end + 1 - preIndex);
                preIndex = end + 1;
                regObj.lastIndex = 0;
                if (!ifDo) {
                    continue;
                }
                lineDecoration.push({ start: start, end: end, className: className });
            }
        }
        lineDecoration.sort(function(arg1, arg2) {
            if (arg1.start < arg2.start) {
                return -1
            } else if (arg1.start == arg2.start) {
                return 0;
            } else {
                return 1;
            }
        })
        this.linesDecoration[currentLine - 1] = lineDecoration;
    }
    //多行代码高亮
    _proto.pairHighlight = function(currentLine) {
        if (currentLine < 1) {
            return;
        }
        var self = this,
            hasRender = false,
            renderArr = [],
            checkPreRegArr = [currentLine]
        _doMatch(currentLine);
        _checkPairSuffixReg(currentLine);
        _checkPairPreReg(currentLine);
        _renderPair();
        _checkLineIfInPair(currentLine);
        _checkRender(currentLine);
        //进行多行匹配
        function _doMatch(currentLine) {
            for (var i = 0; i < pairReg.length; i++) {
                _execPairReg(i, true);
                _execPairReg(i, false);
            }
            //多行匹配
            function _execPairReg(regIndex, ifPre) {
                var regObj = null;
                if (ifPre) {
                    regObj = pairReg[regIndex].pre;
                } else {
                    regObj = pairReg[regIndex].suffix;
                }
                var match = null,
                    matchs = {},
                    str = self.linesText[currentLine - 1],
                    preIndex = 0;
                while (match = regObj.exec(str)) {
                    var className = pairReg[regIndex].className,
                        start, end;
                    if (!match[1]) {
                        start = match.index + preIndex;
                        end = start + match[0].length - 1;
                    } else {
                        start = match.index + match[0].indexOf(match[1]) + preIndex;
                        end = start + match[1].length - 1;
                    }
                    matchs[start] = { line: currentLine, start: start, end: end, className: className } //start->end代表匹配的两端
                    str = str.substr(end + 1 - preIndex);
                    preIndex = end + 1;
                    regObj.lastIndex = 0;
                }
                var doneRegObj = null;
                if (ifPre) {
                    doneRegObj = self.donePreReg[currentLine - 1];
                } else {
                    doneRegObj = self.doneSuffixReg[currentLine - 1];
                }
                if (!doneRegObj) { // 全部是新增的
                    doneRegObj = {};
                    for (var column in matchs) {
                        matchs[column].undo = true;
                        doneRegObj[column] = {};
                        doneRegObj[column][regIndex] = matchs[column];
                    }
                    if (Util.keys(doneRegObj).length) {
                        if (ifPre) {
                            self.donePreReg[currentLine - 1] = doneRegObj;
                        } else {
                            self.doneSuffixReg[currentLine - 1] = doneRegObj;
                        }
                    }
                } else {
                    for (var column in matchs) { //判断是否为新增的
                        if (!doneRegObj[column] || !doneRegObj[column][regIndex]) {
                            matchs[column].undo = true;
                            doneRegObj[column] = doneRegObj[column] || {};
                            doneRegObj[column][regIndex] = matchs[column];
                        }
                    }
                    for (var column in doneRegObj) { //判断是否删除了
                        if (!matchs[column] && doneRegObj[column][regIndex]) {
                            doneRegObj[column][regIndex].del = true;
                        }
                    }
                }
            }
        }
        //检测suffixReg
        function _checkPairSuffixReg(currentLine) {
            var lineDoneSuffixReg = self.doneSuffixReg[currentLine - 1] || {};
            for (var column in lineDoneSuffixReg) {
                var matchs = lineDoneSuffixReg[column];
                for (var regIndex in matchs) { //处理suffixRegs
                    var suffixObj = matchs[regIndex];
                    var className = pairReg[regIndex].className;
                    if (suffixObj.undo) { //匹配到新的suffixReg
                        var endLine = self.linesText.length,
                            startPre = null;
                        //寻找前一个最近的未匹配到suffix的preReg所在的行
                        var ifDo = false;
                        for (var i = currentLine; !ifDo && i >= 1; i--) {
                            var lineDonePreReg = self.donePreReg[i - 1];
                            if (lineDonePreReg) {
                                var cArr = Util.keys(lineDonePreReg);
                                Util.sortNum(cArr);
                                for (var c = 0; c < cArr.length; c++) {
                                    var preObj = lineDonePreReg[cArr[c]][regIndex];
                                    //preObj是否满足匹配条件
                                    if (preObj && !preObj.del) {
                                        //preReg和suffixReg存在同行和非同行两种情况
                                        if (preObj.line < currentLine || preObj.line == currentLine && suffixObj.start > preObj.end) {
                                            //preObj.endSuffix不存在、已删除，或者preObj.endSuffix包含当前suffixObj区域，才可能被suffixObj所取代
                                            if (!preObj.endSuffix && preObj == self.lineEndPreReg || preObj.endSuffix && (preObj.endSuffix.del || preObj.endSuffix.line > currentLine || preObj.endSuffix.line == currentLine && preObj.endSuffix.start > suffixObj.start)) {
                                                ifDo = true;
                                            }
                                        }
                                    }
                                    //preObj是否可用
                                    if (ifDo) {
                                        //重新检查preObj修饰
                                        preObj.undo = true;
                                        if (checkPreRegArr.indexOf(preObj.line) == -1) {
                                            checkPreRegArr.push(preObj.line);
                                        }
                                        __getNextNearPreReg(preObj, suffixObj, regIndex);
                                        break;
                                    }
                                }
                            }
                        }
                        suffixObj.undo = false;
                    } else if (suffixObj.del) {
                        if (suffixObj.startPre) {
                            //重新检查startPre修饰
                            suffixObj.startPre.undo = true;
                            if (checkPreRegArr.indexOf(suffixObj.startPre.line) == -1) {
                                checkPreRegArr.push(suffixObj.startPre.line);
                            }
                            __getNextNearPreReg(suffixObj.startPre, suffixObj, regIndex);
                        }
                        delete matchs[regIndex];
                        if (Util.keys(matchs).length == 0) {
                            delete lineDoneSuffixReg[column];
                        }
                    } else if (suffixObj.startPre) {
                        if (renderArr.indexOf(suffixObj.startPre) == -1) {
                            renderArr.push(suffixObj.startPre);
                        }
                    }
                }
            }
            //获取将要处理的preReg之后最近的一个preReg，这个最近的preReg可能受到影响
            function __getNextNearPreReg(preReg, endSuffix, regIndex) {
                if (endSuffix) {
                    for (var i = endSuffix.line; i <= self.linesText.length; i++) {
                        var ldpr = self.donePreReg[i - 1];
                        for (var c in ldpr) {
                            var pr = ldpr[c][regIndex]
                            if (pr && (pr.line > endSuffix.line || pr.line == endSuffix.line && pr.start > endSuffix.start)) {
                                pr.undo = true;
                                if (checkPreRegArr.indexOf(pr.startPre) == -1) {
                                    checkPreRegArr.push(pr.line);
                                }
                            }
                        }
                    }
                }
            }
        }
        //检测preReg
        function _checkPairPreReg() {
            checkPreRegArr.sort();
            for (var l = 0; l < checkPreRegArr.length; l++) {
                var currentLine = checkPreRegArr[l];
                var lineDonePreReg = self.donePreReg[currentLine - 1] || {};
                //先处理需要删除的修饰，避免删掉新增的修饰
                for (var column in lineDonePreReg) {
                    var matchs = lineDonePreReg[column];
                    for (var regIndex in matchs) {
                        var preObj = matchs[regIndex];
                        var className = pairReg[regIndex].className;
                        if (preObj.del) { //不再匹配preReg
                            //preObj.endSuffix为空，且self.lineEndPreReg不再等于preObj，说明最后一行已经被重新添加了新的整行修饰
                            var line = preObj.endSuffix ? preObj.endSuffix.line : self.lineEndPreReg == preObj && self.linesText.length + 1;
                            for (var i = currentLine + 1; line && i <= line - 1; i++) {
                                self.highlight(i);
                                self.linesDom[i - 1].find('.code').html(renderHTML(i));
                                self.linesDom[i - 1].find('.code').removeClass(className);
                            }
                            //去除suffix行修饰
                            if (preObj.endSuffix) {
                                preObj.endSuffix.undo = true;
                                preObj.endSuffix.startPre = undefined;
                                if (preObj.endSuffix.line > preObj.line) {
                                    _delDecoration(self.linesDecoration[line - 1], { start: preObj.endSuffix.decoStart, end: preObj.endSuffix.end, className: className });
                                    self.linesDom[line - 1].find('.code').html(renderHTML(line));
                                }
                                //寻找其修饰的区域是否存储plain preReg
                                var sf = preObj.endSuffix;
                                for (var i = currentLine; i <= sf.line; i++) {
                                    var ldpr = self.donePreReg[i - 1];
                                    for (var c in ldpr) {
                                        var pr = ldpr[c][regIndex];
                                        if (pr && pr.plain && (i > currentLine && i < sf.line || i == currentLine && i < sf.line && pr.start > preObj.start || i > currentLine && i == sf.line && pr.start < sf.start || currentLine == sf.line && pr.start > preObj.starat && pr.start < sf.start)) {
                                            pr.plain = false;
                                            pr.undo = true;
                                            if (checkPreRegArr.indexOf(i) == -1) {
                                                checkPreRegArr.push(i);
                                                checkPreRegArr.sort();
                                            }
                                        }
                                    }
                                }
                            } else if (!preObj.plain) {
                                //寻找其修饰的区域是否存储plain preReg
                                var sf = preObj.endSuffix;
                                for (var i = currentLine; i <= self.linesText.length; i++) {
                                    var ldpr = self.donePreReg[i - 1];
                                    for (var c in ldpr) {
                                        var pr = ldpr[c][regIndex];
                                        if (pr && pr.plain && (i > currentLine || i == currentLine && i < sf.line && pr.start > preObj.start)) {
                                            pr.plain = false;
                                            pr.undo = true;
                                            if (checkPreRegArr.indexOf(i) == -1) {
                                                checkPreRegArr.push(i);
                                                checkPreRegArr.sort();
                                            }
                                        }
                                    }
                                }
                            }
                            //删除本行修饰
                            _delDecoration(self.linesDecoration[currentLine - 1], { start: preObj.start, end: preObj.decoEnd, className: className });
                            self.linesDom[currentLine - 1].find('.code').html(renderHTML(currentLine));
                            delete matchs[regIndex];
                            if (Util.keys(matchs).length == 0) {
                                delete lineDonePreReg[column];
                            }
                            if (self.lineEndPreReg == preObj) {
                                self.lineEndPreReg = undefined;
                            }
                            hasRender = true;
                        } else if (!preObj.undo && !preObj.plain) {
                            //渲染当前行
                            if (renderArr.indexOf(preObj) == -1) {
                                renderArr.push(preObj);
                            }
                        }
                    }
                }
                //处理需要添加的修饰
                for (var column in lineDonePreReg) {
                    var matchs = lineDonePreReg[column];
                    for (var regIndex in matchs) {
                        var preObj = matchs[regIndex];
                        var className = pairReg[regIndex].className;
                        if (preObj.undo) { //新匹配到preReg
                            var endSuffix = null,
                                preEndSuffix = preObj.endSuffix,
                                preEndLine = endLine = self.linesText.length + 1;
                            if (preEndSuffix) { //之前对应的suffix所在的行
                                preEndLine = preEndSuffix.line;
                            }
                            //寻找最近的匹配了suffixReg的行
                            var ifDo = false,
                                hasSuffix = false;
                            for (var tmp = currentLine; !hasSuffix && tmp <= self.doneSuffixReg.length; tmp++) {
                                var lineDoneSuffixReg = self.doneSuffixReg[tmp - 1];
                                if (lineDoneSuffixReg) {
                                    var cArr = Util.keys(lineDoneSuffixReg);
                                    Util.sortNum(cArr);
                                    for (var i = 0; i < cArr.length; i++) {
                                        var suffixObj = lineDoneSuffixReg[cArr[i]][regIndex];
                                        //suffixObj是否满足匹配条件
                                        if (suffixObj && !suffixObj.del) {
                                            //suffixObj和preObj存在同行和非同行两种情况
                                            if (suffixObj.line > preObj.line || suffixObj.line == preObj.line && suffixObj.start > preObj.start) {
                                                hasSuffix = true; //其后是否有suffix
                                                if (!suffixObj.startPre || suffixObj.startPre.line > preObj.line || suffixObj.startPre.line == preObj.line && suffixObj.startPre.start > preObj.start) {
                                                    ifDo = true;
                                                }
                                            }
                                        }
                                        if (ifDo) {
                                            endSuffix = suffixObj;
                                            endLine = endSuffix.line;
                                            endSuffix.undo = false;
                                            endSuffix.startPre = preObj;
                                        }
                                        if (hasSuffix) {
                                            break;
                                        }
                                    }
                                }
                            }
                            preObj.endSuffix = endSuffix;
                            //之前对应的endSuffix
                            if (preEndSuffix) {
                                preEndSuffix.undo = true;
                                preEndSuffix.startPre = undefined;
                                if (preEndSuffix.line > preObj.line && (!endSuffix || endSuffix.line != preEndSuffix.line)) {
                                    _delDecoration(self.linesDecoration[preEndSuffix.line - 1], { start: preEndSuffix.decoStart, end: preEndSuffix.end, className: className });
                                    self.linesDom[preEndSuffix.line - 1].find('.code').html(renderHTML(preEndSuffix.line));
                                }
                            }
                            /*
                                过滤/*....../*....
                                或者/*......
                                    /*.....
                                中间的‘/*’
                             */
                            if ((ifDo || !hasSuffix) && (endSuffix || !endSuffix && (!self.lineEndPreReg || preObj.line < self.lineEndPreReg.line || preObj.line == self.lineEndPreReg.line && preObj.start < self.lineEndPreReg.start))) {
                                //渲染匹配的首尾行
                                if (renderArr.indexOf(preObj) == -1) {
                                    renderArr.push(preObj);
                                }
                                if (!endSuffix) {
                                    self.lineEndPreReg = preObj;
                                } else {
                                    self.lineEndPreReg = undefined;
                                }
                                //添加整行修饰
                                for (var i = currentLine + 1; i <= endLine - 1; i++) {
                                    self.linesDom[i - 1].find('.code').html(self.linesText[i - 1]);
                                    self.linesDom[i - 1].find('.code').addClass(className);
                                }
                                //删除之前的整行修饰
                                for (var i = endLine + 1; i <= preEndLine - 1; i++) {
                                    self.highlight(i);
                                    self.linesDom[i - 1].find('.code').html(renderHTML(i));
                                    self.linesDom[i - 1].find('.code').removeClass(className);
                                }
                                preObj.plain = false;
                            } else {
                                preObj.plain = true;
                            }
                            preObj.undo = false;
                        } else if (!preObj.del && !preObj.plain) {
                            //渲染当前行
                            if (renderArr.indexOf(preObj) == -1) {
                                renderArr.push(preObj);
                            }
                        }
                    }
                }
            }
        }
        //渲染首尾行
        function _renderPair() {
            for (var i = 0; i < renderArr.length; i++) {
                _renderLine(renderArr[i]);
                hasRender = true;
            }
        }
        //检测当前行是否在多行修饰中
        function _checkLineIfInPair(currentLine) {
            for (var i = 1; i < currentLine; i++) {
                var lineDonePreReg = self.donePreReg[i - 1];
                if (lineDonePreReg) {
                    for (var column in lineDonePreReg) {
                        for (var regIndex in lineDonePreReg[column]) {
                            var regObj = lineDonePreReg[column][regIndex];
                            var className = regObj.className;
                            if (!regObj.plain && (!regObj.endSuffix || regObj.endSuffix.line > currentLine)) {
                                self.linesDom[currentLine - 1].find('.code').html(self.linesText[currentLine - 1]);
                                self.linesDom[currentLine - 1].find('.code').addClass(className);
                                hasRender = true;
                            }
                        }
                    }
                }
            }
        }
        //检查当前行是否渲染过
        function _checkRender(currentLine) {
            if (!hasRender) {
                self.linesDom[currentLine - 1].find('.code').html(renderHTML(currentLine));
            }
        }
        //插入修饰
        function _insertDecoration(lineDecoration, decoration) {
            var ifDo = true;
            for (var i = 0; i < lineDecoration.length; i++) { //删除和decoration有交叉的修饰
                var l = lineDecoration[i];
                if (decoration.className == l.className && l.start <= decoration.start && l.end >= decoration.end && l.end - l.start > decoration.end - decoration.start) {
                    ifDo = false;
                    break;
                }
            }
            if (!ifDo) {
                return;
            }
            for (var i = 0; i < lineDecoration.length; i++) { //删除和decoration有交叉的修饰
                var l = lineDecoration[i];
                if (!(l.start > decoration.end || l.end < decoration.start)) {
                    lineDecoration.splice(i, 1);
                    i--;
                }
            }
            lineDecoration.push(decoration);
            lineDecoration.sort(function(arg1, arg2) {
                if (arg1.start < arg2.start) {
                    return -1
                } else if (arg1.start == arg2.start) {
                    return 0;
                } else {
                    return 1;
                }
            })
        }
        //删除修饰
        function _delDecoration(lineDecoration, decoration) {
            for (var i = 0; i < lineDecoration.length; i++) { //删除和decoration有交叉的修饰
                var _l = lineDecoration[i];
                if (decoration.start == _l.start && decoration.end == _l.end) {
                    lineDecoration.splice(i, 1);
                    break;
                }
            }
        }
        //处理首尾行修饰
        function _renderLine(startPre) {
            var endSuffix = startPre.endSuffix;
            if (endSuffix && startPre.line == endSuffix.line) {
                _insertDecoration(self.linesDecoration[startPre.line - 1], { start: startPre.start, end: endSuffix.end, className: startPre.className })
                self.linesDom[startPre.line - 1].find('.code').html(renderHTML(startPre.line)).removeClass(startPre.className);
                startPre.decoEnd = endSuffix.end;
                endSuffix.decoStart = startPre.start;
            } else if (!endSuffix) {
                _insertDecoration(self.linesDecoration[startPre.line - 1], { start: startPre.start, end: self.linesText[startPre.line - 1].length - 1, className: startPre.className })
                self.linesDom[startPre.line - 1].find('.code').html(renderHTML(startPre.line)).removeClass(startPre.className);
                startPre.decoEnd = self.linesText[startPre.line - 1].length - 1;
            } else if (endSuffix) {
                _insertDecoration(self.linesDecoration[startPre.line - 1], { start: startPre.start, end: self.linesText[startPre.line - 1].length - 1, className: startPre.className })
                _insertDecoration(self.linesDecoration[endSuffix.line - 1], { start: 0, end: endSuffix.end, className: startPre.className })
                self.linesDom[startPre.line - 1].find('.code').html(renderHTML(startPre.line)).removeClass(startPre.className);
                self.linesDom[endSuffix.line - 1].find('.code').html(renderHTML(endSuffix.line)).removeClass(startPre.className);
                startPre.decoEnd = self.linesText[startPre.line - 1].length - 1;
                endSuffix.decoStart = 0;
            }
        }

        function renderHTML(line) {
            var str = self.linesText[line - 1];
            var doneRangeOnline = self.linesDecoration[line - 1];
            //处理单行匹配结果
            for (var i = doneRangeOnline.length - 1; i >= 0; i--) {
                var obj = doneRangeOnline[i];
                str = Util.insertStr(str, obj.end + 1, '</span>');
                str = Util.insertStr(str, obj.start, '<span class="' + obj.className + '">');
            }
            return str;
        }
    }
    //重置行号
    _proto.resetDoneRegLine = function(line) {
        for (var i = line - 1; i < this.linesText.length; i++) {
            for (var column in this.donePreReg[i]) {
                for (var regIndex in this.donePreReg[i][column]) {
                    this.donePreReg[i][column][regIndex].line = i + 1;
                }
            }
            for (var column in this.doneSuffixReg[i]) {
                for (var regIndex in this.doneSuffixReg[i][column]) {
                    this.doneSuffixReg[i][column][regIndex].line = i + 1;
                }
            }
        }
    }
    _proto.onAddLine = function(line) {
        //多行匹配pre记录后移一位
        this.donePreReg.splice(line - 1, 0, undefined);
        //多行匹配suffix记录后移一位
        this.doneSuffixReg.splice(line - 1, 0, undefined);
        this.resetDoneRegLine(line);
        this.highlight(line);
        this.pairHighlight(line);
    }
    _proto.onUpdateLine = function(line) {
        this.highlight(line);
        this.pairHighlight(line);
    }
    _proto.onDeleteLine = function(line) {
        //多行匹配pre记录前移一位
        this.donePreReg.splice(line - 1, 1);
        //多行匹配suffix记录前移一位
        this.doneSuffixReg.splice(line - 1, 1);
        this.resetDoneRegLine(line);
        this.pairHighlight(line - 1);
    }
    window.SubJsMode = JsMode;
}()