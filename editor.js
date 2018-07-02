! function($) {
    var pairReg = [{
        pre: /^(?:[^'"]*?|(?:[^'"]*?(?:'\w*'|"\w*")[^'"]*?)*?)(\/\*[^\n]*)(?:\*\/)?/,
        suffix: /\*\//
    }]

    var reg = [
        /^(?:[^'"]*?|(?:[^'"]*?(?:'\w*'|"\w*")[^'"]*?)*?)(\/\/[^\n]*)/, //单行注释
        /'[\s\S]*?'|"[\s\S]*?"/g, //字符串
        /\b(?:break|continue|do|else|for|if|return|while|var|function|new|class)\b/g, //关键字
        /\!==|\!=|==|=|\?|\&\&|\&=|\&|\|\||\|=|\||>=|>|<=|<|\+=|\+|\-=|\-|\*=|\*|\/=|\//g, //操作符
        /\d+|\b(?:undefined|null)(?:[\b;]|$)/g, //数字
        /[.]?([\w]+)(?=\()/g, //方法名
    ]

    var pairClassNames = ['pair_comment']
    var classNames = ['comment', 'string', 'key', 'oprator', 'number', 'method'];

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
        arrToNumber: function(arr) {
            for (var i = 0; i < arr.length; i++) {
                arr[i] = Number(arr[i]);
            }
        }
    }

    function SubJs(options) {
        options = options || {};
        this.currentNode = null; //光标所在的节点
        this.currentContent = ''; //光标所在的内容区域 
        this.lines = ['']; //所有的行
        this.lineNum = 0; //行号
        this.linesDom = [];
        this.pos = { line: 1, column: 0 };
        this.syntax = options.syntax || 'javascript';
        this.donePreReg = {}; //多行匹配开始记录
        this.doneSuffixReg = {}; //多行匹配结束记录
        if (typeof options.$wrapper == 'string') {
            this.$wrapper = $(options.$wrapper);
        } else if (typeof options.$wrapper == 'object') {
            this.$wrapper = options.$wrapper;
        } else {
            return new Error('$wrapper must be string or object');
        }
        this._init();
    }

    var _proto = SubJs.prototype;

    _proto._init = function() {
        let self = this;
        var $wrap = $('<div class="editor_wrap" style="height:100%;overflow:auto;padding:5px 0 0 40px,position:relative;z-index:1"></div>');
        this.$leftNumBg = $('<div class="line_num_bg" style="position:absolute;top:0;left:0;width:40px;height:100%"></div>');
        this.$context = $('<div class="editor_context" style="position:relative;z-index:1;min-height:100%;margin:0 15px 0 45px;"></div>');
        $wrap.append(this.$context);
        this.$wrapper.append(this.$leftNumBg);
        this.$wrapper.append($wrap);
        this.$wrapper.css({ position: 'relative' });
        //全角符号和中文字符
        this.fullAngleReg = /[\x00-\x1f\x80-\xa0\xad\u1680\u180E\u2000-\u200f\u2028\u2029\u202F\u205F\u3000\uFEFF\uFFF9-\uFFFC]|[\u1100-\u115F\u11A3-\u11A7\u11FA-\u11FF\u2329-\u232A\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u303E\u3041-\u3096\u3099-\u30FF\u3105-\u312D\u3131-\u318E\u3190-\u31BA\u31C0-\u31E3\u31F0-\u321E\u3220-\u3247\u3250-\u32FE\u3300-\u4DBF\u4E00-\uA48C\uA490-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
        this.getCharWidth();
        this.creatTextarea();
        this.updateLine();
        this.bindEvent();
    }
    _proto.bindEvent = function() {
        var self = this;
        this.$context.on('click', function(e) {
            if (e.target != self.$context[0]) {
                self.pos.line = Math.floor(e.target.offsetParent.offsetTop / self.charHight) + 1;
            } else {
                self.pos.line = Math.ceil(e.offsetY / self.charHight);
            }
            var column = Math.round(e.offsetX / self.charWidth);
            column = column < 0 ? 0 : column;
            var left = column * self.charWidth;
            if (self.pos.line > self.lines.length) {
                self.pos.line = self.lines.length;
                column = self.lines.length;
            }else if (column > self.lines[self.pos.line - 1].length) {
                column = self.lines[self.pos.line - 1].length
            }
            while (column > 0) {
                var str = self.lines[self.pos.line - 1].substring(0, column);
                var match = str.match(self.fullAngleReg);
                var _left = str.length * self.charWidth;
                if (match) {
                    _left += match.length * self.charWidth;
                }
                if (_left <= left) {
                    self.pos.column = column;
                    break;
                }
                column--;
            }
            self.$textarea[0].focus();
            self.updateCursorPos();
        })
        this.$textarea.on('keydown', function(e) {
            switch (e.keyCode) {
                case 37: //left arrow
                    if (self.pos.column > 0) {
                        self.pos.column--;
                    } else if (self.pos.line > 1) {
                        self.pos.line--;
                        self.pos.column = self.lines[self.pos.line - 1].length;
                    }
                    break;
                case 38: //up arrow
                    if (self.pos.line > 1) {
                        self.pos.line--;
                    }
                    break;
                case 39: //right arrow
                    if (self.pos.column < self.lines[self.pos.line - 1].length) {
                        self.pos.column++;
                    } else if (self.pos.line < self.lines.length) {
                        self.pos.line++;
                        self.pos.column = 0;
                    }
                    break;
                case 40: //down arrow
                    if (self.pos.line < self.lines.length) {
                        self.pos.line++;
                    }
                    break;
                case 46: //delete
                    var str = self.lines[self.pos.line - 1];
                    str = str.substring(0, self.pos.column) + str.substr(self.pos.column + 1);
                    self.lines[self.pos.line - 1] = str;
                    self.updateLine();
                    break;
                case 8: //backspace
                    var str = self.lines[self.pos.line - 1];
                    str = str.substring(0, self.pos.column - 1) + str.substr(self.pos.column);
                    self.lines[self.pos.line - 1] = str;
                    if (self.pos.column > 0) {
                        self.pos.column--;
                    } else if (self.pos.line > 1) {
                        self.pos.line--;
                        self.pos.column = self.lines[self.pos.line - 1].length;
                        self.lines[self.pos.line - 1] = self.lines[self.pos.line - 1] + self.lines[self.pos.line];
                        self.lines.splice(self.pos.line, 1);
                        self.deleteLine(self.pos.line + 1);
                    }
                    self.updateLine();
                    break;
                case 13: //换行
                    // case 108: //数字键换行
                    var str = self.lines[self.pos.line - 1];
                    self.lines[self.pos.line - 1] = str.substring(0, self.pos.column);
                    self.updateLine();
                    self.pos.line++;
                    self.lines.splice(self.pos.line - 1, 0, str.substr(self.pos.column));
                    self.pos.column = 0;
                    self.addLine();
                    setTimeout(function() {
                        self.$textarea.val('');
                    }, 0);
                    break;
                default:
                    setTimeout(function() {
                        var val = self.$textarea.val();
                        if (val) {
                            var str = self.lines[self.pos.line - 1];
                            str = str.substring(0, self.pos.column) + val + str.substr(self.pos.column);
                            self.lines[self.pos.line - 1] = str;
                            self.pos.column += val.length;
                            self.updateLine();
                            self.$textarea.val('');
                            self.updateCursorPos();
                        }
                    }, 0)
            }
            self.updateCursorPos();
        })
    }
    //获取字符宽度
    _proto.getCharWidth = function() {
        var str = 'XXXXXXXXXXXXXX';
        this.$context[0].innerHTML = '<pre><span style="display:inline-block" class="char_width">' + str + '</span></pre>';
        this.charWidth = $('.char_width')[0].clientWidth / str.length;
        this.charHight = $('.char_width')[0].clientHeight;
        this.$context[0].innerHTML = '';
        console.log('charSize', this.charWidth, this.charHight);
    }
    //创建输入框
    _proto.creatTextarea = function() {
        var wrapStyle = 'position:absolute;top:0;left:0;overflow:hidden;width:' + this.charWidth + 'px;height:1em;';
        var areaStyle = 'height:1em;width:' + this.charWidth + 'px;padding:0;outline:none;border-style:none;resize:none;overflow:hidden;background-color:transparent'
        this.$context[0].innerHTML = '<div id="subjs_editor_textarea_wrap" style="' + wrapStyle + '"><textarea id="subjs_editor_textarea" style="' + areaStyle + '"></textarea></div>'
        this.$textarea = this.$context.find('#subjs_editor_textarea');
        this.$textWrap = this.$context.find('#subjs_editor_textarea_wrap');
    }
    //更新一行
    _proto.updateLine = function() {
        var $linePre = this.linesDom[this.pos.line - 1];
        if ($linePre) {
            $linePre.find('.code').html(this.highlight(this.pos.line))
            this.pairHighlight(this.pos.line);
        } else {
            this.addLine();
        }
    }
    _proto.addLine = function() {
        var $linePre = $('.pre_code_line')[this.pos.line - 1];
        var $dom = $('<pre style="position:relative;margin:0;height:' + this.charHight + 'px;" class="pre_code_line">' +
            '<span class="line_num" style="position:absolute;left:-45px;top:0;width:36px;padding-right:4px;">' + this.pos.line + '</span>' +
            '<div class="code" style="height:100%;">' + this.highlight(this.pos.line) + '</div></pre>');
        if (!$linePre) {
            this.$context.append($dom);
        } else {
            $dom.insertBefore($linePre)
        }
        this.linesDom.splice(this.pos.line - 1, 0, $dom);

        var lineKeys = Util.keys(this.donePreReg || {});
        Util.arrToNumber(lineKeys);
        lineKeys.sort();
        lineKeys.reverse();
        for (var tmp = 0; tmp < lineKeys.length; tmp++) {
            //多行匹配pre记录后移一位
            if (lineKeys[tmp] > this.pos.line) {
                this.donePreReg[lineKeys[tmp]] = this.donePreReg[lineKeys[tmp] - 1];
                delete this.donePreReg[lineKeys[tmp] - 1]
            } else {
                break;
            }
        }

        lineKeys = Util.keys(this.doneSuffixReg || {});
        lineKeys.sort();
        lineKeys.reverse();
        for (var tmp = 0; tmp < lineKeys.length; tmp++) {
            //多行匹配suffix记录后移一位
            if (lineKeys[tmp] > this.pos.line) {
                this.doneSuffixReg[lineKeys[tmp]] = this.doneSuffixReg[lineKeys[tmp] - 1];
                for (var regIndex in this.doneSuffixReg[lineKeys[tmp]]) {
                    this.doneSuffixReg[lineKeys[tmp]][regIndex].line = lineKeys[tmp];
                }
                delete this.doneSuffixReg[lineKeys[tmp] - 1]
            } else {
                break;
            }
        }

        this.pairHighlight(this.pos.line - 1);
        this.pairHighlight(this.pos.line);
    }
    //删除一行
    _proto.deleteLine = function(line) {
        this.linesDom[line - 1].remove();
        this.linesDom.splice(line - 1, 1);

        var lineKeys = Util.keys(this.donePreReg || {});
        Util.arrToNumber(lineKeys);
        lineKeys.sort();
        lineKeys.reverse();
        for (var tmp = 0; tmp < lineKeys.length; tmp++) {
            //多行匹配pre记录前移一位
            if (lineKeys[tmp] > this.pos.line) {
                this.donePreReg[lineKeys[tmp]] = this.donePreReg[lineKeys[tmp] + 1];
                delete this.donePreReg[lineKeys[tmp] + 1]
            } else {
                break;
            }
        }

        lineKeys = Util.keys(this.doneSuffixReg || {});
        Util.arrToNumber(lineKeys);
        lineKeys.sort();
        lineKeys.reverse();
        for (var tmp = 0; tmp < lineKeys.length; tmp++) {
            //多行匹配suffix记录后移一位
            if (lineKeys[tmp] > this.pos.line) {
                this.doneSuffixReg[lineKeys[tmp]] = this.doneSuffixReg[lineKeys[tmp] + 1];
                for (var regIndex in this.doneSuffixReg[lineKeys[tmp]]) {
                    this.doneSuffixReg[lineKeys[tmp]][regIndex].line = lineKeys[tmp];
                }
                delete this.doneSuffixReg[lineKeys[tmp] + 1]
            } else {
                break;
            }
        }

        this.pairHighlight(this.pos.line);
    }
    //创建光标
    _proto.createCrusor = function() {

    }
    _proto.updateCursorPos = function() {
        var self = this;
        var top = (this.pos.line - 1) * this.charHight;
        var str = this.lines[this.pos.line - 1].substring(0, this.pos.column);
        var match = str.match(this.fullAngleReg);
        var left = str.length * this.charWidth;
        if (match) {
            left += match.length * this.charWidth;
        }
        this.$textWrap.css({
            top: top + 'px',
            left: left + 'px'
        });
    }
    //单行代码高亮
    _proto.highlight = function(currentLine) {
        var self = this;
        var str = this.lines[currentLine - 1];
        var doneRangeOnline = []; //一行中已处理过的区域
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
            var match = regObj.exec(str),
                className = pairClassNames[regIndex],
                start, end;
            if (!match) {
                if (ifPre && self.donePreReg[currentLine] && self.donePreReg[currentLine][regIndex]) {
                    self.donePreReg[currentLine][regIndex] = { del: true, line: currentLine }
                } else if (!ifPre && self.doneSuffixReg[currentLine] && self.doneSuffixReg[currentLine][regIndex]) {
                    self.doneSuffixReg[currentLine][regIndex] = { del: true, line: currentLine }
                }
                return;
            }
            if (!match[1]) {
                start = match.index;
                end = start + match[0].length - 1;
            } else {
                start = match.index + match[0].indexOf(match[1]);
                end = start + match[1].length - 1;
            }
            if (ifPre) {
                doneRangeOnline.push({ start: start, end: end, className: className });
                if (!self.donePreReg[currentLine] || !self.donePreReg[currentLine][regIndex]) {
                    self.donePreReg[currentLine] = self.donePreReg[currentLine] || [];
                    self.donePreReg[currentLine][regIndex] = { undo: true, line: currentLine }
                }
            } else {
                doneRangeOnline.push({ start: 0, end: end, className: 'flag__' + className });
                if (!self.doneSuffixReg[currentLine] || !self.doneSuffixReg[currentLine][regIndex]) {
                    self.doneSuffixReg[currentLine] = self.doneSuffixReg[currentLine] || [];
                    self.doneSuffixReg[currentLine][regIndex] = { undo: true, line: currentLine }
                }
            }
        }
        //单行匹配
        for (var i = 0; i < reg.length; i++) {
            var match = null;
            var regObj = reg[i];
            while (match = regObj.exec(str)) {
                var start, end;
                if (!match[1]) {
                    start = match.index;
                    end = start + match[0].length - 1;
                } else {
                    start = match.index + match[0].indexOf(match[1]);
                    end = start + match[1].length - 1;
                }
                var className = classNames[i];
                var ifDo = true;
                for (var tmp = 0; tmp < doneRangeOnline.length; tmp++) {
                    if (start >= doneRangeOnline[tmp].start && start <= doneRangeOnline[tmp].end ||
                        end >= doneRangeOnline[tmp].start && end <= doneRangeOnline[tmp].end) {
                        ifDo = false;
                    }
                }
                if (!ifDo) {
                    continue;
                }
                doneRangeOnline.push({ start: start, end: end, className: className });
                if (!regObj.global) { //不是全局匹配
                    break;
                }
            }
            regObj.lastIndex = 0;
        }
        doneRangeOnline.sort(function(arg1, arg2) {
            if (arg1.start < arg2.start) {
                return -1
            } else if (arg1.start == arg2.start) {
                return 0;
            } else {
                return 1;
            }
        })
        //处理单行匹配结果
        for (var i = doneRangeOnline.length - 1; i >= 0; i--) {
            var obj = doneRangeOnline[i];
            str = Util.insertStr(str, obj.end + 1, '</span>');
            str = Util.insertStr(str, obj.start, '<span class="' + obj.className + '">');
        }

        return str;
    }
    //多行代码高亮
    _proto.pairHighlight = function(currentLine) {
        var self = this;
        //处理多行匹配preRegs结果
        _checkPairPreReg(currentLine);
        _checkPairSuffixReg(currentLine);
        _checkLineIfInPair(currentLine);

        //检测当前行是否为匹配头
        function _checkPairPreReg(currentLine) {
            var lineDonePreReg = self.donePreReg[currentLine] || {};
            for (var regIndex in lineDonePreReg) { //处理preRegs
                var preObj = lineDonePreReg[regIndex];
                if (preObj.undo) { //新匹配到preReg
                    var lineKeys = Util.keys(self.doneSuffixReg || {});
                    var endLine = self.lines.length + 1,
                        endSuffix;
                    Util.arrToNumber(lineKeys);
                    lineKeys.sort();
                    //寻找最近的匹配了suffixReg的行
                    for (var tmp = 0; tmp < lineKeys.length; tmp++) {
                        if (self.doneSuffixReg[lineKeys[tmp]][regIndex] && lineKeys[tmp] >= currentLine) {
                            endLine = lineKeys[tmp];
                            endSuffix = self.doneSuffixReg[lineKeys[tmp]][regIndex];
                            self.linesDom[endLine - 1].find('.flag__' + pairClassNames[regIndex])
                                .removeClass('flag__' + pairClassNames[regIndex])
                                .addClass(pairClassNames[regIndex]);
                            break;
                        }
                    }
                    for (var tmp = currentLine + 1; tmp <= endLine - 1; tmp++) {
                        self.linesDom[tmp - 1].addClass(pairClassNames[regIndex]);
                    }
                    preObj.undo = false;
                    preObj.endSuffix = endSuffix;
                } else if (preObj.del) { //不再匹配preReg
                    var line = preObj.endSuffix ? preObj.endSuffix.line : self.lines.length + 1;
                    for (var tmp = currentLine; tmp <= line - 1; tmp++) {
                        self.linesDom[tmp - 1].removeClass(pairClassNames[regIndex]);
                    }
                    preObj.del = false;
                }
            }
        }
        //检测匹配尾是否为匹配尾
        function _checkPairSuffixReg(currentLine) {
            var lineDoneSuffixReg = self.doneSuffixReg[currentLine] || {};
            for (var regIndex in lineDoneSuffixReg) { //处理suffixRegs
                var suffixObj = lineDoneSuffixReg[regIndex];
                if (suffixObj.undo) { //匹配到新的suffixReg
                    for (var tmp = currentLine; tmp <= self.lines.length; tmp++) {
                        self.linesDom[tmp - 1].removeClass(pairClassNames[regIndex]);
                    }
                    var lineKeys = Util.keys(self.donePreReg || {});
                    var nearPreLine = -1;
                    Util.arrToNumber(lineKeys);
                    lineKeys.sort();
                    lineKeys.reverse();
                    for (var tmp = 0; tmp < lineKeys.length; tmp++) {
                        //该行对应的前一个最近的未匹配到suffix的preReg行需要重新添加class
                        var obj = self.donePreReg[lineKeys[tmp]][regIndex];
                        if (lineKeys[tmp] < currentLine && obj && !obj.endSuffix) {
                            self.donePreReg[lineKeys[tmp]][regIndex].undo = true;
                            nearPreLine = lineKeys[tmp];
                            break;
                        }
                    }
                    if (nearPreLine > -1) {
                        var tmp = self.donePreReg[nearPreLine][regIndex].endSuffix;
                        var line = tmp ? tmp.line : self.lines.length + 1;
                        for (tmp = currentLine; tmp <= line - 1; tmp++) { //删除对应的class
                            self.linesDom[tmp - 1].removeClass(pairClassNames[regIndex]);
                        }
                        nearPreLine > -1 && _checkPairPreReg(nearPreLine); //重新添加满足条件的行的class
                    }
                    suffixObj.undo = false;
                } else if (suffixObj.del) {
                    var lineKeys = Util.keys(self.donePreReg || {});
                    var nearPreLine = -1;
                    Util.arrToNumber(lineKeys);
                    lineKeys.sort();
                    lineKeys.reverse();
                    for (var tmp = 0; tmp < lineKeys.length; tmp++) {
                        //该行前一个对应preReg的最进的行需要重新添加class
                        if (self.donePreReg[lineKeys[tmp]][regIndex] && lineKeys[tmp] < currentLine) {
                            self.donePreReg[lineKeys[tmp]][regIndex].undo = true;
                            nearPreLine = lineKeys[tmp];
                            break;
                        }
                    }
                    delete self.doneSuffixReg[currentLine];
                    nearPreLine > -1 && _checkPairPreReg(nearPreLine); //重新添加满足条件的行的class
                }
            }
        }
        //检测当前行是否在多行匹配中
        function _checkLineIfInPair(currentLine) {
            var lineKeys = Util.keys(self.donePreReg || {});
            Util.arrToNumber(lineKeys);
            lineKeys.sort();
            for (var tmp = 0; tmp < lineKeys.length; tmp++) {
                var line = lineKeys[tmp];
                if (line < currentLine) {
                    for (var regIndex in self.donePreReg[line]) {
                        var obj = self.donePreReg[line][regIndex].endSuffix;
                        var line = obj ? obj.line : self.lines.length + 1;
                        if (line - 1 >= currentLine) {
                            self.linesDom[currentLine - 1].addClass(pairClassNames[regIndex]);
                        }
                    }
                } else {
                    break;
                }
            }
        }
    }


    window.SubJs = SubJs;
}($)