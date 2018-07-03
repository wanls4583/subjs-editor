! function($) {
    var pairReg = [{
        pre: /^(?:[^'"]*?|(?:[^'"]*?(?:'\w*'|"\w*")[^'"]*?)*?)(\/\*[^\n]*)(?:\*\/)?/,
        suffix: /\*\//,
        className: 'pair_comment'
    }]

    var reg = [
        /^(?:[^'"]*?|(?:[^'"]*?(?:'\w*'|"\w*")[^'"]*?)*?)(\/\/[^\n]*)/, //单行注释
        /'[\s\S]*?'|"[\s\S]*?"/g, //字符串
        /\b(?:break|continue|do|else|for|if|return|while|var|function|new|class)\b/g, //关键字
        /\!==|\!=|==|=|\?|\&\&|\&=|\&|\|\||\|=|\||>=|>|<=|<|\+=|\+|\-=|\-|\*=|\*|\/=|\//g, //操作符
        /\d+|\b(?:undefined|null)(?:[\b;]|$)/g, //数字
        /[.]?([\w]+)(?=\()/g, //方法名
    ]

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
        },
        getSelectedText: function() {
            if (document.selection) {
                return document.selection.createRange().text;
            } else if (window.getSelection) {
                return window.getSelection().toString();
            }
        },
        selectAll: function(element) {
            if (document.selection) {
                var range = document.body.createTextRange();
                range.moveToElementText(element);
                range.select();
            } else if (window.getSelection) {
                var range = document.createRange();
                range.selectNode(element);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
            }
        },
        getStyleVal: function(dom, prop) {
            if (window.getComputedStyle) {
                return window.getComputedStyle(dom, null)[prop];
            } else {
                return dom.currentStyle[prop]
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
        this.options = {}; //参数
        if (typeof options.$wrapper == 'string') {
            this.options.$wrapper = $(options.$wrapper);
        } else if (typeof options.$wrapper == 'object') {
            this.options.$wrapper = options.$wrapper;
        } else {
            return new Error('$wrapper must be string or object');
        }
        this.options.tabsize = options.tabsize || 4;
        this._init();
    }

    var _proto = SubJs.prototype;

    _proto._init = function() {
        var self = this;
        //全角符号和中文字符
        this.fullAngleReg = /[\x00-\x1f\x80-\xa0\xad\u1680\u180E\u2000-\u200f\u2028\u2029\u202F\u205F\u3000\uFEFF\uFFF9-\uFFFC]|[\u1100-\u115F\u11A3-\u11A7\u11FA-\u11FF\u2329-\u232A\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u303E\u3041-\u3096\u3099-\u30FF\u3105-\u312D\u3131-\u318E\u3190-\u31BA\u31C0-\u31E3\u31F0-\u321E\u3220-\u3247\u3250-\u32FE\u3300-\u4DBF\u4E00-\uA48C\uA490-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
        this.creatContext();
        this.getCharWidth();
        this.creatTextarea();
        this.updateLine();
        this.bindEvent();
    }
    _proto.bindEvent = function() {
        var self = this;
        this.$context.on('click', function(e) {
            if (Util.getSelectedText()) {
                return;
            }
            if (e.target != self.$context[0]) {
                self.pos.line = Math.floor($(e.target).parents('.pre_code_line')[0].offsetTop / self.charHight) + 1;
            } else {
                self.pos.line = Math.ceil(e.offsetY / self.charHight);
            }
            if (self.pos.line > self.lines.length) {
                self.pos.line = self.lines.length;
                self.pos.column = self.lines[self.lines.length - 1].length;
            } else {
                var column = Math.ceil(e.offsetX / self.charWidth);
                var str = self.lines[self.pos.line - 1]
                column = column < 0 ? 0 : column;
                column = column > str.length ? str.length : column;
                var left = e.offsetX;
                var match = str.match(self.fullAngleReg);
                var maxWidth = str.length * self.charWidth;
                if (match) {
                    maxWidth += match.length * (self.fullAngleCharWidth - self.charWidth);
                }
                if (left > maxWidth) {
                    left = maxWidth;
                }
                while (column > 0) {
                    var str = self.lines[self.pos.line - 1].substring(0, column);
                    var match = str.match(self.fullAngleReg);
                    var _left = str.length * self.charWidth;
                    if (match) {
                        _left += match.length * (self.fullAngleCharWidth - self.charWidth);
                    }
                    if (Math.abs(_left - left) < self.charWidth) {
                        self.pos.column = column;
                        break;
                    }
                    column--;
                }
            }
            self.$textarea[0].focus();
            self.updateCursorPos();
        })
        this.$textarea.on('keydown', function(e) {
            if (e.ctrlKey && e.keyCode == 65) { //ctrl+a
                e.preventDefault();
                self.$textWrap.hide();
                Util.selectAll(self.$context[0]);
                setTimeout(function(){
                    self.$textWrap.show();
                },50);
            } else {
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
                    case 9: //tab
                        e.preventDefault();
                        var val = '';
                        for (var tmp = 0; tmp < self.options.tabsize; tmp++) { val += ' ' };
                        _update(val);
                        break;
                    default:
                        setTimeout(function() {
                            var val = self.$textarea.val();
                            val && _update(val);
                        }, 0)
                }
            }

            function _update(val) {
                var str = self.lines[self.pos.line - 1];
                str = str.substring(0, self.pos.column) + val + str.substr(self.pos.column);
                var strs = str.split(/\r\n|\r|\n/);
                self.lines[self.pos.line - 1] = strs[0];
                self.pos.column += val.length;
                self.updateLine();
                for (var tmp = 1; tmp < strs.length; tmp++) { //粘贴操作可能存在换号符
                    self.pos.line++;
                    self.lines.splice(self.pos.line - 1, 0, strs[tmp]);
                    self.pos.column = strs[tmp].length;
                    self.addLine();
                }
                self.$textarea.val('');
                self.updateCursorPos();
            }

            self.updateCursorPos();
        })
    }
    //获取字符宽度
    _proto.getCharWidth = function() {
        var str1 = 'XXXXXXXXXXXXXX';
        var str2 = '啊啊啊啊啊啊啊啊';
        this.$context[0].innerHTML = '<span style="display:inline-block" class="char_width_1">' + str1 + '</span><span style="display:inline-block" class="char_width_2">' + str2 + '</span>';
        var dom = $('.char_width_1')[0];
        this.charWidth = dom.clientWidth / str1.length;
        this.charHight = dom.clientHeight;
        this.fullAngleCharWidth = $('.char_width_2')[0].clientWidth / str2.length;
        this.fontSize = window.getComputedStyle ? window.getComputedStyle(dom, null).fontSize : dom.currentStyle.fontSize;
        this.$context[0].innerHTML = '';
        console.log('charSize', this.charWidth, this.fullAngleCharWidth, this.charHight);
    }
    _proto.creatContext = function() {
        this.$leftNumBg = $('<div class="line_num_bg" style="float:left;width:40px;min-height:100%;padding:5px 0;box-sizing:border-box"></div>');
        this.$context = $('<div class="editor_context" style="position:relative;min-height:100%;margin:0 15px 0 45px;padding:5px 0;box-sizing:border-box"></div>');
        this.$wrapper = $('<div class="editor_wrap"></div>');
        this.$wrapper.append(this.$leftNumBg);
        this.$wrapper.append(this.$context);
        this.$wrapper.css({ position: 'relative', overflow: 'auto', height: '100%' });
        this.options.$wrapper.append(this.$wrapper);
    }
    //创建输入框
    _proto.creatTextarea = function() {
        var wrapStyle = 'position:absolute;top:0;left:0;overflow:hidden;width:' + this.charWidth + 'px;height:' + this.charHight + 'px';
        var areaStyle = 'height:' + this.charHight + 'px;line-height:' + this.charHight + 'px;width:' + this.charWidth + 'px;padding:0;outline:none;border-style:none;resize:none;overflow:hidden;background-color:transparent'
        this.$context[0].innerHTML = '\
            <div id="subjs_editor_textarea_wrap" style="' + wrapStyle + '">\
                <textarea id="subjs_editor_textarea" style="' + areaStyle + '"></textarea>\
            </div>';
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
        var marginL = Util.getStyleVal(this.$context[0], 'marginLeft');
        var marginR = Util.getStyleVal(this.$context[0], 'marginRight');
        var $dom = $('\
            <div style="position:relative;margin:0;height:' + this.charHight + 'px;" class="pre_code_line">\
                <i class="current_line_bg" style="display:none;position:absolute;left:-45px;top:0;z-index:1;height:100%;width:100%;padding-left:' + marginL + ';padding-right:' + marginR + '"></i>\
                <div class="code" style="position:relative;z-index:2;height:100%;white-space:pre">' + this.highlight(this.pos.line) + '</div>\
            </div>');
        if (!$linePre) {
            this.$context.append($dom);
        } else {
            $dom.insertBefore($linePre)
        }
        var $num = $('<span class="line_num">' + this.lines.length + '</span>')
        $num.css({
            'display': 'block',
            'height': this.charHight + 'px',
            'line-height': this.charHight + 'px',
            'width': '36px',
            'padding-right': '4px',
            'user-select': 'none',
            'text-align': 'right',
            'font-size': this.fontSize
        })
        this.$leftNumBg.append($num);
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
        this.$leftNumBg.find('.line_num:last').remove();
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
        var paddingTop = Util.getStyleVal(this.$context[0], 'paddingTop');
        paddingTop = parseInt(paddingTop.substring(0, paddingTop.length - 2));
        if (match) {
            left += match.length * (this.fullAngleCharWidth - this.charWidth);
        }
        this.$textWrap.css({
            top: top + paddingTop + 'px',
            left: left + 'px'
        });
        if (this.$currentLineBg) {
            this.$currentLineBg.hide();
        }
        this.$currentLineBg = this.linesDom[this.pos.line - 1].find('.current_line_bg').show();

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
                className = pairReg[regIndex].className,
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
                self.donePreReg[currentLine] = self.donePreReg[currentLine] || [];
                self.donePreReg[currentLine][regIndex] = { undo: true, line: currentLine }
            } else {
                doneRangeOnline.push({ start: 0, end: end, className: 'flag__' + className });
                self.doneSuffixReg[currentLine] = self.doneSuffixReg[currentLine] || [];
                self.doneSuffixReg[currentLine][regIndex] = { undo: true, line: currentLine }
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
                var className = pairReg[regIndex].className;
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
                            self.linesDom[endLine - 1].find('.flag__' + className)
                                .removeClass('flag__' + className)
                                .addClass(className);
                            break;
                        }
                    }
                    for (var tmp = currentLine + 1; tmp <= endLine - 1; tmp++) {
                        self.linesDom[tmp - 1].addClass(className);
                    }
                    preObj.undo = false;
                    preObj.endSuffix = endSuffix;
                } else if (preObj.del) { //不再匹配preReg
                    var line = preObj.endSuffix ? preObj.endSuffix.line : self.lines.length + 1;
                    for (var tmp = currentLine; tmp <= line - 1; tmp++) {
                        self.linesDom[tmp - 1].removeClass(className);
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
                var className = pairReg[regIndex].className;
                if (suffixObj.undo) { //匹配到新的suffixReg
                    for (var tmp = currentLine; tmp <= self.lines.length; tmp++) {
                        self.linesDom[tmp - 1].removeClass(className);
                    }
                    var lineKeys = Util.keys(self.donePreReg || {});
                    var nearPreLine = -1;
                    Util.arrToNumber(lineKeys);
                    lineKeys.sort();
                    lineKeys.reverse();
                    for (var tmp = 0; tmp < lineKeys.length; tmp++) {
                        //该行对应的前一个最近的未匹配到suffix的preReg行需要重新添加class
                        var obj = self.donePreReg[lineKeys[tmp]][regIndex];
                        if (lineKeys[tmp] < currentLine && obj) {
                            self.donePreReg[lineKeys[tmp]][regIndex].undo = true;
                            obj.endSuffix = undefined;
                            nearPreLine = lineKeys[tmp];
                            break;
                        }
                    }
                    if (nearPreLine > -1) {
                        var tmp = self.donePreReg[nearPreLine][regIndex].endSuffix;
                        var line = tmp ? tmp.line : self.lines.length + 1;
                        for (tmp = currentLine; tmp <= line - 1; tmp++) { //删除对应的class
                            self.linesDom[tmp - 1].removeClass(className);
                        }
                        _checkPairPreReg(nearPreLine); //重新添加满足条件的行的class
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
                        var className = pairReg[regIndex].className;
                        var obj = self.donePreReg[line][regIndex].endSuffix;
                        var line = obj ? obj.line : self.lines.length + 1;
                        if (line - 1 >= currentLine) {
                            self.linesDom[currentLine - 1].addClass(className);
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