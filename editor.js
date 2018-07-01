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
        }
    }

    function SubJs(options) {
        options = options || {};
        this.currentNode = null; //光标所在的节点
        this.currentContent = ''; //光标所在的内容区域 
        this.lines = ['']; //所有的行
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
        this.$wrapper.css('overflow', 'auto');
        // switch (this.syntax) {
        //     case 'javascript':
        //         this.mode = new JsMode();
        //         break;
        // }
        //全角符号和中文字符
        this.fullAngleReg = /[\x00-\x1f\x80-\xa0\xad\u1680\u180E\u2000-\u200f\u2028\u2029\u202F\u205F\u3000\uFEFF\uFFF9-\uFFFC]|[\u1100-\u115F\u11A3-\u11A7\u11FA-\u11FF\u2329-\u232A\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u303E\u3041-\u3096\u3099-\u30FF\u3105-\u312D\u3131-\u318E\u3190-\u31BA\u31C0-\u31E3\u31F0-\u321E\u3220-\u3247\u3250-\u32FE\u3300-\u4DBF\u4E00-\uA48C\uA490-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
        this.getCharWidth();
        this.creatTextarea();
        this.$wrapper.on('click', function(e) {
            if (e.target != self.$wrapper[0]) {
                self.pos.line = Math.floor(e.target.offsetTop / self.charHight) + 1;
            } else {
                self.pos.line = Math.ceil(e.offsetY / self.charHight);
            }
            if (self.pos.line > self.lines.length) {
                self.pos.line = self.lines.length
            }
            var column = Math.round(e.offsetX / self.charWidth);
            var left = column * self.charWidth;
            if (column > self.lines[self.pos.line - 1].length) {
                column = self.lines[self.pos.line - 1].length
            }
            while (true) {
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
        this.$wrapper[0].innerHTML = '<pre><span style="display:inline-block" class="char_width">' + str + '</span></pre>';
        this.charWidth = $('.char_width')[0].clientWidth / str.length;
        this.charHight = $('.char_width')[0].clientHeight;
        this.$wrapper[0].innerHTML = '';
        console.log('charSize', this.charWidth, this.charHight);
    }
    //创建输入框
    _proto.creatTextarea = function() {
        var wrapStyle = 'position:absolute;top:0;left:0;overflow:hidden;width:' + this.charWidth + 'px;height:1em;';
        var areaStyle = 'height:1em;width:' + this.charWidth + 'px;padding:0;outline:none;border-style:none;resize:none;overflow:hidden;background-color:transparent'
        this.$wrapper[0].innerHTML = '<div id="subjs_editor_textarea_wrap" style="' + wrapStyle + '"><textarea id="subjs_editor_textarea" style="' + areaStyle + '"></textarea></div>'
        this.$textarea = this.$wrapper.find('#subjs_editor_textarea');
        this.$textWrap = this.$wrapper.find('#subjs_editor_textarea_wrap');
    }
    //更新一行
    _proto.updateLine = function() {
        var $linePre = this.linesDom[this.pos.line - 1];
        if ($linePre) {
            $linePre.html(this.highlight(this.pos.line))
        } else {
            this.addLine();
        }
    }
    _proto.addLine = function() {
        var $linePre = $('.pre_code_line')[this.pos.line - 1];
        var $dom = $('<pre style="margin:0;height:' + this.charHight + 'px;" class="pre_code_line">' +
            this.highlight(this.pos.line) + '</pre>');
        if (!$linePre) {
            this.$wrapper.append($dom);
        } else {
            $dom.insertBefore($linePre)
        }
        this.linesDom.splice(this.pos.line - 1, 0, $dom)
    }
    //删除一行
    _proto.deleteLine = function(line) {
        this.linesDom[line - 1].remove();
        this.linesDom.splice(line - 1, 1);
        for (var key in this.donePreReg) {
            var obj = this.donePreReg[key];
            delete obj[line];
        }
        for (var key in this.doneSuffixReg) {
            var obj = this.doneSuffixReg[key];
            delete obj[line];
        }
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
    //代码高亮
    _proto.highlight = function(line) {
        var self = this;
        var str = this.lines[line - 1];
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
                if (ifPre && self.donePreReg[line] && self.donePreReg[line][regIndex]) {
                    self.donePreReg[line][regIndex] = { del: true }
                } else if(!ifPre && self.doneSuffixReg[line] && self.doneSuffixReg[line][regIndex]){
                    self.doneSuffixReg[line][regIndex] = { del: true }
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
                if (!self.donePreReg[line] || self.donePreReg[line][regIndex]) {
                    self.donePreReg[line] = self.donePreReg[line] || [];
                    self.donePreReg[line][regIndex] = { undo: true }
                }
            } else {
                doneRangeOnline.push({ start: 0, end: end, className: className });
                if (!self.doneSuffixReg[line] || self.doneSuffixReg[line][regIndex]) {
                    self.doneSuffixReg[line] = self.doneSuffixReg[line] || [];
                    self.doneSuffixReg[line][regIndex] = { undo: true }
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
        //处理多行匹配preRegs结果
        _doPairRegResult();
        _doPairSuffixResult();

        function _doPairRegResult() {
            var lineDonePreReg = self.donePreReg[line] || {};
            for (var regIndex in lineDonePreReg) { //处理preRegs
                var preObj = lineDonePreReg[regIndex];
                if (preObj.undo) { //新匹配到preReg
                    var lineKeys = Util.keys(self.doneSuffixReg || {});
                    var endLine = self.lines.length + 1;
                    lineKeys.sort();
                    //寻找最近的匹配了suffixReg的行
                    for (var tmp = 0; tmp < lineKeys.length; tmp++) {
                        if (self.doneSuffixReg[lineKeys[tmp]].regIndex == regIndex && lineKeys[tmp] >= line && lineKeys[tmp] < endLine) {
                            endLine = lineKeys[tmp];
                            break;
                        }
                    }
                    for (var tmp = line + 1; tmp < endLine; tmp++) {
                        self.linesDom[tmp - 1].addClass(pairClassNames[regIndex]);
                    }
                    preObj.undo = false;
                    preObj.endLine = endLine;
                } else if (preObj.del) { //不再匹配preReg
                    for (var tmp = line; tmp <= preObj.endLine; tmp++) {
                        self.linesDom[tmp - 1].removeClass(pairClassNames[regIndex]);
                    }
                    preObj.del = false;
                }
            }
        }

        function _doPairSuffixResult() {
            var lineDoneSuffixReg = self.doneSuffixReg[line] || {};
            for (var regIndex in lineDoneSuffixReg) { //处理suffixRegs
                var suffixObj = lineDoneSuffixReg[regIndex];
                if (suffixObj.undo) { //匹配到新的suffixReg
                    for (var tmp = line; tmp <= self.lines.length; tmp++) {
                        self.linesDom[tmp - 1].removeClass(pairClassNames[regIndex]);
                    }
                    var lineKeys = Util.keys(self.donePreReg || {});
                    for (var tmp = lineKeys.length - 1; tmp >= 0; tmp--) { 
                        //该行后的对应preReg的行需要重新添加class
                        if (self.donePreReg[lineKeys[tmp]].regIndex == regIndex && lineKeys[tmp] > line) {
                            self.donePreReg[lineKeys[tmp]].undo = true;
                        }
                    }
                    for (var tmp = line; tmp <= self.lines.length; tmp++) { //删除该行后所有行对应的class
                        self.linesDom[tmp - 1].removeClass(pairClassNames[regIndex]);
                    }
                    suffixObj.undo = false;
                    _doPairRegResult(); //重新添加满足条件的行的class
                } else if (suffixObj.del) {
                    if (self.linesDom[line - 1].find('.' + pairClassNames[regIndex])[0]) {
                        for (var tmp = line; tmp <= self.lines.length; tmp++) {
                            self.linesDom[tmp - 1].addClass(pairClassNames[regIndex]);
                        }
                    }
                    suffixObj.del = false;
                }
            }
        }
        return str;
    }


    window.SubJs = SubJs;
}($)