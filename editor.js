! function($) {
    var pairReg = [{
        pre: /^(?:[^'"]*?|(?:[^'"]*?(?:'\w*'|"\w*")[^'"]*?)*?)(\/\*)/,
        suffix: /^(?:[^'"]*?|(?:[^'"]*?(?:'\w*'|"\w*")[^'"]*?)*?)(\*\/)/,
        className: 'pair_comment'
    }]
    var reg = [/^(?:[^'"]*?|(?:[^'"]*?(?:'\w*'|"\w*")[^'"]*?)*?)(\/\/[^\n]*)/, //单行注释
        /'[\s\S]*?'|"[\s\S]*?"/, //字符串
        /\b(?:break|continue|do|else|for|if|return|while|var|function|new|class)\b/, //关键字
        /\!==|\!=|==|=|\?|\&\&|\&=|\&|\|\||\|=|\||>=|>|<=|<|\+=|\+|\-=|\-|\*=|\*|\/=|\//, //操作符
        /\d+|\b(?:undefined|null)(?:[\b;]|$)/, //数字
        /[.]?([\w]+)(?=\()/, //方法名
    ]
    var classNames = ['comment', 'string', 'key', 'oprator', 'number', 'method'];
    var Util = {
        //全角符号和中文字符
        fullAngleReg: /[\x00-\x1f\x80-\xa0\xad\u1680\u180E\u2000-\u200f\u2028\u2029\u202F\u205F\u3000\uFEFF\uFFF9-\uFFFC]|[\u1100-\u115F\u11A3-\u11A7\u11FA-\u11FF\u2329-\u232A\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u303E\u3041-\u3096\u3099-\u30FF\u3105-\u312D\u3131-\u318E\u3190-\u31BA\u31C0-\u31E3\u31F0-\u321E\u3220-\u3247\u3250-\u32FE\u3300-\u4DBF\u4E00-\uA48C\uA490-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g,
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
        getSelectedText: function() {
            if (document.selection) {
                return document.selection.createRange().text;
            } else if (window.getSelection) {
                return window.getSelection().toString();
            }
        },
        select: function(element) {
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
        copy: function(value) {
            var element = document.createElement('SPAN');
            element.textContent = value;
            document.body.appendChild(element);
            this.select(element);
            if (document.execCommand) {
                document.execCommand('copy');
            } else {
                window.clipboardData.setData('text', value);
            }
            element.remove ? element.remove() : element.removeNode(true);
        },
        getStyleVal: function(dom, prop) {
            if (window.getComputedStyle) {
                return window.getComputedStyle(dom, null)[prop];
            } else {
                return dom.currentStyle[prop]
            }
        },
        nextFrame: function(callback) {
            if (window.requestAnimationFrame) {
                window.requestAnimationFrame(callback);
            } else {
                setTimeout(function() {
                    callback();
                }, 0);
            }
        },
        getRect: function(dom) {
            var _r = dom.getBoundingClientRect();
            var _pt = this.getStyleVal(dom, 'paddingTop');
            _pt = parseInt(_pt.substring(0, _pt.length - 2));
            var _pb = Util.getStyleVal(dom, 'paddingBottom');
            _pb = parseInt(_pb.substring(0, _pb.length - 2));
            var _pl = this.getStyleVal(dom, 'paddingLeft');
            _pl = parseInt(_pl.substring(0, _pl.length - 2));
            var _pr = this.getStyleVal(dom, 'paddingRight');
            _pr = parseInt(_pr.substring(0, _pr.length - 2));
            var _mt = this.getStyleVal(dom, 'marginTop');
            _mt = parseInt(_mt.substring(0, _mt.length - 2));
            var _mb = Util.getStyleVal(dom, 'marginBottom');
            _mb = parseInt(_mb.substring(0, _mb.length - 2));
            var _ml = this.getStyleVal(dom, 'marginLeft');
            _ml = parseInt(_ml.substring(0, _ml.length - 2));
            var _mr = this.getStyleVal(dom, 'marginRight');
            _mr = parseInt(_mr.substring(0, _mr.length - 2));
            return {
                top: _r.top,
                bottom: _r.bottom,
                left: _r.left,
                right: _r.right,
                paddingTop: _pt,
                paddingBottom: _pb,
                paddingLeft: _pl,
                paddingRight: _pr,
                marginTop: _mt,
                marginBottom: _mb,
                marginLeft: _ml,
                marginRight: _mr,
                offsetTop: dom.offsetTop,
                offsetBottom: dom.offsetBottom,
                offsetLeft: dom.offsetLeft,
                offsetRight: dom.offsetRight,
            }
        },
        getStrWidth: function(str, charW, fullCharW, start, end) {
            if (typeof start != 'undefined') {
                str = str.substr(start);
            }
            if (typeof end != 'undefined') {
                str = str.substring(0, end - start);
            }
            var match = str.match(this.fullAngleReg);
            var width = str.length * charW;
            if (match) {
                width += match.length * (fullCharW - charW);
            }
            return width;
        }
    }

    function SubJs(options) {
        options = options || {};
        this.currentNode = null; //光标所在的节点
        this.currentContent = ''; //光标所在的内容区域 
        this.linesText = []; //所有的行
        this.linesDom = []; //行对应的dom
        this.linesDecoration = []; //行对应的修饰
        this.cursorPos = { line: 1, column: 0 }; //光标位置
        this.donePreReg = []; //多行匹配开始记录
        this.doneSuffixReg = []; //多行匹配结束记录
        this.selection = {};
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
        this.creatContext();
        this.getCharWidth();
        this.creatTextarea();
        this.createCrusor();
        this.createLeftNumBg();
        this.createLineBg();
        this.bindEvent();
        this.bindEditorEvent();
        this.addLine(1, '');
    }
    _proto.bindEvent = function() {
        this.bindInputEvent();
        this.bindScrollEvent();
        this.bindSelectEvent();
    }
    //选中事件
    _proto.bindSelectEvent = function() {
        var self = this;
        var startPx = {};
        var endPx = {};
        var rect = Util.getRect(self.$scroller[0]);
        var scrollTop = self.$scroller[0].scrollTop;
        var select = false;
        this.$wrapper.on('selectstart', function(e) {
            //阻止浏览器默认选中文字
            e.preventDefault();
        })
        this.$wrapper.on('mousedown', function(e) {
            var top = e.clientY - rect.top + scrollTop;
            var left = e.clientX - rect.left + scrollTop;
            startPx = { top: top, left: left };
            if (e.button != 2) {
                self.selection.selectText = '';
                self.selection.startPos = null;
                self.selection.endPos = null;
                self.$selectBg.html('');
                select = true;
            }
        });
        this.$wrapper.on('mousemove', function(e) {
            if (select) {
                var top = e.clientY - rect.top + scrollTop;
                var left = e.clientX - rect.left + scrollTop;
                endPx = { top: top, left: left };
                _renderSelectBg();
            }
        });
        this.$wrapper.on('mouseup', function(e) {
            select = false;
        })
        //渲染选中背景
        function _renderSelectBg() {
            var startPos = self.pxToPos(startPx.top, startPx.left);
            var endPos = self.pxToPos(endPx.top, endPx.left);
            self.$selectBg.html('');
            if (startPos.line > endPos.line) {
                var tmp = startPos;
                startPos = endPos;
                endPos = tmp;
            } else if (startPos.line == endPos.line && startPos.column > endPos.column) {
                var tmp = startPos.column;
                startPos.column = endPos.column;
                endPos.column = tmp;
            }
            self.selection.startPos = startPos;
            self.selection.endPos = endPos;
            if (startPos.line == endPos.line) {
                if (Math.abs(endPx.left - startPx.left) > self.charWidth) {
                    var str = self.linesText[startPos.line - 1];
                    var width = Util.getStrWidth(str, self.charWidth, self.fullAngleCharWidth, startPos.column, endPos.column);
                    var px = self.posToPx(startPos.line, startPos.column);
                    self.renderRange(px.top, px.left, width);
                    self.selection.selectText = str.substring(startPos.column, endPos.column);
                }
            } else {
                var str = self.linesText[startPos.line - 1];
                var maxWidth = self.$context[0].scrollWidth;
                var width = Util.getStrWidth(str, self.charWidth, self.fullAngleCharWidth, 0, startPos.column);
                var px = self.posToPx(startPos.line, startPos.column);
                self.renderRange(px.top, px.left, maxWidth - width);
                self.selection.selectText = str;
                for (var l = startPos.line + 1; l < endPos.line; l++) {
                    px = self.posToPx(l, 0);
                    self.renderRange(px.top, rect.paddingLeft, maxWidth);
                    self.selection.selectText += '\n'
                    self.linesText[l - 1];
                }
                str = self.linesText[endPos.line - 1];
                width = Util.getStrWidth(str, self.charWidth, self.fullAngleCharWidth, 0, endPos.column);
                px = self.posToPx(endPos.line, 0);
                self.renderRange(px.top, px.left, width);
                self.selection.selectText += '\n' + str.substring(0, endPos.column);
            }
        }
    }
    //鼠标编辑事件
    _proto.bindEditorEvent = function() {
        var self = this;
        this.$textarea.on('copy', function() {
            self.copyText = self.selection.selectText;
            self.$textarea.val(self.copyText);
            self.$textarea.select();
        })
        this.$textarea.on('paste', function(e) {
            if (self.selection.startPos) {
                self.deleteMutilLine(self.selection.startPos, self.selection.endPos);
            }
            if (!self.copyText) {
                if (e.originalEvent.clipboardData) {
                    self.copyText = e.originalEvent.clipboardData.getData('text');
                    self.insertOnLine(self.copyText);
                }
            } else {
                self.insertOnLine(self.copyText);
            }
            self.$selectBg.html('');
            self.selection = {};
        })
        this.$textarea.on('cut', function() {
            self.copyText = self.selection.selectText;
            self.$textarea.val(self.copyText);
            self.$textarea.select();
            if (self.selection.startPos) {
                self.deleteMutilLine(self.selection.startPos, self.selection.endPos);
            }
            self.$selectBg.html('');
            self.selection = {};
        })
        this.$textarea.on('select', function() {
            //全选
            if (Util.getSelectedText() == self.selectAllText) {
                self.selectAll();
                self.$textarea.val(''); //防止下次触发全选
            }
        })
        this.$textarea.on('mouseup', function(e) {
            var rect = Util.getRect(self.$scroller[0]);
            var top = e.clientY - rect.top + self.$scroller[0].scrollTop;
            var _px = self.pxToPos(top, e.clientX - rect.left + self.$scroller[0].scrollTop);
            var line = _px.line;
            var column = _px.column;
            if (e.button != 2) { //单纯的点击
                self.cursorPos.line = line;
                self.cursorPos.column = column;
                self.$textarea[0].focus();
                self.updateCursorPos();
            } else {
                self.$textarea[0].focus();
                if (self.selection.selectText) {
                    self.$textarea.val(self.selection.selectText);
                    self.$textarea[0].select();
                }
                Util.nextFrame(function() {
                    self.selectAllText = Math.random();
                    self.$textarea.val(self.selectAllText); //触发全选
                });
            }
        })
    }
    //滚动条事件
    _proto.bindScrollEvent = function() {
        var self = this;
        this.$scroller.on('scroll', function(e) {
            self.$leftNumBg.css('top', -this.scrollTop + 'px');
            self.$lineBg.css({
                top: self.linesDom[self.cursorPos.line - 1][0].offsetTop - self.$scroller[0].scrollTop + 'px',
            });
        })
    }
    //输入事件
    _proto.bindInputEvent = function() {
        var self = this;
        var preCode = 0;
        this.$textarea.on('keydown', function(e) {
            self.$textarea.val('');
            if (e.ctrlKey && e.keyCode == 65) { //ctrl+a
                e.preventDefault();
                self.selectAll();
            } else if (e.ctrlKey && e.keyCode == 67) { //ctrl+c
                self.$textarea.val('');
            } else if (e.ctrlKey && e.keyCode == 86) { //ctrl+v
                self.$textarea.val('');
            } else {
                switch (e.keyCode) {
                    case 37: //left arrow
                        if (self.cursorPos.column > 0) {
                            self.cursorPos.column--;
                        } else if (self.cursorPos.line > 1) {
                            self.cursorPos.line--;
                            self.cursorPos.column = self.linesText[self.cursorPos.line - 1].length;
                        }
                        break;
                    case 38: //up arrow
                        if (self.cursorPos.line > 1) {
                            self.cursorPos.line--;
                            self.cursorPos.column = self.pxToPos(self.cursorPos.line, self.cursorPos.left, true).column;
                        }
                        break;
                    case 39: //right arrow
                        if (self.cursorPos.column < self.linesText[self.cursorPos.line - 1].length) {
                            self.cursorPos.column++;
                        } else if (self.cursorPos.line < self.linesText.length) {
                            self.cursorPos.line++;
                            self.cursorPos.column = 0;
                        }
                        break;
                    case 40: //down arrow
                        if (self.cursorPos.line < self.linesText.length) {
                            self.cursorPos.line++;
                            self.cursorPos.column = self.pxToPos(self.cursorPos.line, self.cursorPos.left, true).column;
                        }
                        break;
                    case 46: //delete
                        var str = self.linesText[self.cursorPos.line - 1];
                        str = str.substring(0, self.cursorPos.column) + str.substr(self.cursorPos.column + 1);
                        self.updateLine(self.cursorPos.line, str);
                        break;
                    case 8: //backspace
                        if (self.selection.startPos) {
                            self.deleteMutilLine(self.selection.startPos, self.selection.endPos);
                            self.$selectBg.html('');
                            self.selection = {};
                        } else {
                            var str = self.linesText[self.cursorPos.line - 1];
                            str = str.substring(0, self.cursorPos.column - 1) + str.substr(self.cursorPos.column);
                            if (self.cursorPos.column > 0) {
                                self.cursorPos.column--;
                                self.updateLine(self.cursorPos.line, str);
                            } else if (self.cursorPos.line > 1) {
                                var column = self.linesText[self.cursorPos.line - 2].length;
                                self.updateLine(self.cursorPos.line - 1, self.linesText[self.cursorPos.line - 2] + self.linesText[self.cursorPos.line - 1]);
                                self.deleteLine(self.cursorPos.line);
                                self.cursorPos.column = column;
                                self.cursorPos.line--;
                            }
                        }
                        break;
                    case 13: //换行
                    case 108: //数字键换行
                        var str = self.linesText[self.cursorPos.line - 1];
                        self.updateLine(self.cursorPos.line, str.substring(0, self.cursorPos.column));
                        self.addLine(self.cursorPos.line + 1, str.substr(self.cursorPos.column));
                        self.cursorPos.line++;
                        self.cursorPos.column = 0;
                        break;
                    case 9: //tab
                        e.preventDefault();
                        var val = '';
                        for (var tmp = 0; tmp < self.options.tabsize; tmp++) { val += ' ' };
                        self.insertOnLine(val);
                        break;
                    default:
                        if (preCode > 222 && e.keyCode == 16) { //中文输入后shift延迟较大
                            setTimeout(function() {
                                var val = self.$textarea.val();
                                val && self.insertOnLine(val);
                            }, 150);
                        } else {
                            setTimeout(function() {
                                var val = self.$textarea.val();
                                val && self.insertOnLine(val);
                            }, 0)
                        }
                }
            }
            preCode = e.keyCode;
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
    //输入框区域
    _proto.creatContext = function() {
        this.$scroller = $('<div class="editor_scroller" style="position:relative;overflow:auto;margin-left:40px;height:100%;padding:5px 0 0 5px;box-sizing:border-box">\
                <div class="editor_context" style="min-height:100%;cursor:text;"></div>\
                <div class="editor_bg" style="position:absolute;left:0;top:0;z-index:-1"></div>\
            </div>');
        this.$wrapper = $('<div class="editor_wrap"></div>');
        this.$wrapper.append(this.$scroller);
        this.$context = this.$scroller.find('.editor_context');
        this.$selectBg = this.$scroller.find('.editor_bg');
        this.$wrapper.css({ position: 'relative', overflow: 'hidden', height: '100%' });
        this.options.$wrapper.append(this.$wrapper);
    }
    //左侧行号
    _proto.createLeftNumBg = function() {
        this.$leftNumBg = $('<div class="line_num_bg" style="position:absolute;left:0;top:0;z-index:2;width:40px;min-height:100%;padding:5px 0;padding-bottom:' + this.charHight + 'px;box-sizing:border-box"></div>');
        this.$wrapper.append(this.$leftNumBg);
    }
    //创建输入框
    _proto.creatTextarea = function() {
        var self = this;
        var wrapStyle = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:3;overflow:hidden;opacity:0;'
        var areaStyle = 'height:100%;width:100%;padding:0;outline:none;border-style:none;resize:none;overflow:hidden;background-color:transparent;color:transparent'
        this.$textWrap = $('\
            <div id="subjs_editor_textarea_wrap" style="' + wrapStyle + '">\
                <textarea id="subjs_editor_textarea" style="' + areaStyle + '"></textarea>\
            </div>');
        this.$wrapper.append(this.$textWrap);
        this.$textarea = this.$wrapper.find('#subjs_editor_textarea');
        this.$textarea.on('focus', function() {
            self.$cursor.show();
        });
        this.$textarea.on('blur', function() {
            self.$cursor.hide();
        });
    }
    //创建当前行背景
    _proto.createLineBg = function() {
        this.$lineBg = $('<div class="current_line_bg" style="display:none;position:absolute;left:0;right:0;z-index:1;background-color:rgba(0,0,0,0.1);height:' + this.charHight + 'px"></div>');
        this.$wrapper.append(this.$lineBg);
    }
    //创建光标
    _proto.createCrusor = function() {
        this.$cursor = $('<i class="cursor" style="display:none;position:absolute;width:2px;height:' + this.charHight + 'px;background-color:#333"></i>');
        this.$scroller.append(this.$cursor);
        var show = true;
        var self = this;

        function flicker() {
            if (show) {
                self.$cursor.css('visibility', 'visible');
            } else {
                self.$cursor.css('visibility', 'hidden');
            }
            show = !show;
            self.flickerTimer = setTimeout(function() {
                flicker();
            }, 350);
        }
        if (!self.flickerTimer) {
            flicker();
        }
    }
    //更新光标坐标
    _proto.updateCursorPos = function() {
        var pos = this.posToPx(this.cursorPos.line, this.cursorPos.column);
        this.$cursor.css({
            top: pos.top + 'px',
            left: pos.left + 'px'
        });
        this.cursorPos.top = pos.top;
        this.cursorPos.left = pos.left;
        this.$lineBg.show();
        this.updateScroll();
    }
    _proto.updateScroll = function() {
        var context = this.$scroller[0];
        var cRect = Util.getRect(this.$cursor[0]);
        var lRect = Util.getRect(this.$leftNumBg[0]);
        if (cRect.offsetTop <= this.$scroller[0].scrollTop) {
            context.scrollTop = cRect.offsetTop;
        } else if (cRect.offsetTop + this.charHight >= context.scrollTop + this.$wrapper[0].clientHeight) {
            context.scrollTop = cRect.offsetTop + this.charHight - this.$wrapper[0].clientHeight;
        }
        if (cRect.offsetLeft - this.charWidth <= context.scrollLeft) {
            context.scrollLeft = cRect.offsetLeft - this.charWidth;
        } else if (cRect.offsetLeft + this.charWidth * 2 + 30 >= context.scrollLeft + (this.$wrapper[0].clientWidth - context.offsetLeft)) {
            context.scrollLeft = cRect.offsetLeft + this.charWidth * 2 + 30 - (this.$wrapper[0].clientWidth - context.offsetLeft);
        }
        this.$leftNumBg.css('top', -context.scrollTop + 'px');
        this.$lineBg.css({
            top: this.linesDom[this.cursorPos.line - 1][0].offsetTop - context.scrollTop + 'px',
        });
    }
    _proto.posToPx = function(line, column) {
        var self = this;
        var top = (line - 1) * this.charHight;
        var str = this.linesText[line - 1].substring(0, column);
        var match = str.match(Util.fullAngleReg);
        var left = str.length * this.charWidth;
        var rect = Util.getRect(this.$scroller[0]);
        if (match) {
            left += match.length * (this.fullAngleCharWidth - this.charWidth);
        }
        return {
            top: top + rect.paddingTop,
            left: left + rect.paddingLeft
        }
    }
    _proto.pxToPos = function(top, left, ifLine) {
        var column = this.cursorPos.column;
        var rect = Util.getRect(this.$scroller[0]);
        var line = top;
        left -= rect.paddingLeft;
        if (!ifLine) {
            top -= rect.paddingTop;
            line = Math.ceil(top / this.charHight);
        }
        line = line < 1 ? 1 : line;
        if (line > this.linesText.length) {
            line = this.linesText.length;
            column = this.linesText[this.linesText.length - 1].length;
        } else {
            var str = this.linesText[line - 1];
            column = Math.ceil(left / this.charWidth);
            column = column < 0 ? 0 : column;
            column = column > str.length ? str.length : column;
            var match = str.match(Util.fullAngleReg);
            var maxWidth = str.length * this.charWidth;
            if (match) {
                maxWidth += match.length * (this.fullAngleCharWidth - this.charWidth);
            }
            if (left > maxWidth) {
                left = maxWidth;
            } else {
                while (column > 0) {
                    var str = this.linesText[line - 1].substring(0, column);
                    var match = str.match(Util.fullAngleReg);
                    var _left = str.length * this.charWidth;
                    if (match) {
                        _left += match.length * (this.fullAngleCharWidth - this.charWidth);
                    }
                    if (Math.abs(_left - left) < this.charWidth) {
                        break;
                    }
                    column--;
                }
            }
        }
        return {
            line: line,
            column: column
        }
    }
    //更新一行
    _proto.updateLine = function(line, newConent) {
        this.linesText[line - 1] = newConent;
        this.highlight(line);
        this.pairHighlight(line);
    }
    //插入内容
    _proto.insertOnLine = function(val) {
        var str = this.linesText[this.cursorPos.line - 1];
        str = str.substring(0, this.cursorPos.column) + val + str.substr(this.cursorPos.column);
        var strs = str.split(/\r\n|\r|\n/);
        this.cursorPos.column += val.length;
        this.updateLine(this.cursorPos.line, strs[0]);
        for (var tmp = 1; tmp < strs.length; tmp++) { //粘贴操作可能存在换号符
            this.cursorPos.line++;
            this.addLine(this.cursorPos.line, strs[tmp]);
            this.cursorPos.column = strs[tmp].length;
        }
        this.updateCursorPos();
    }
    _proto.addLine = function(line, newConent) {
        this.linesText.splice(line - 1, 0, newConent);
        var $linePre = $('.pre_code_line')[line - 1];
        var $dom = $('\
            <div style="position:relative;margin:0;padding-right:15px;height:' + this.charHight + 'px;" class="pre_code_line">\
                <div class="code" style="display:inline-block;position:relative;height:100%;min-width:100%;box-sizing:border-box;padding-right:10px;white-space:pre"></div>\
            </div>');
        if (!$linePre) {
            this.$scroller.find('.editor_context').append($dom);
        } else {
            $dom.insertBefore($linePre);
        }
        var $num = $('<span class="line_num">' + this.linesText.length + '</span>')
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
        this.linesDom.splice(line - 1, 0, $dom);
        //多行匹配pre记录后移一位
        this.donePreReg.splice(line - 1, 0, undefined);
        //多行匹配suffix记录后移一位
        this.doneSuffixReg.splice(line - 1, 0, undefined);
        //重置行号
        this.resetDoneRegLine(line - 1);
        this.highlight(line);
        this.pairHighlight(line);
    }
    //删除一行
    _proto.deleteLine = function(line) {
        this.linesText.splice(line - 1, 1);
        this.linesDom[line - 1].remove();
        this.$leftNumBg.find('.line_num:last').remove();
        this.linesDom.splice(line - 1, 1);
        //多行匹配pre记录前移一位
        this.donePreReg.splice(line - 1, 1);
        //多行匹配suffix记录前移一位
        this.doneSuffixReg.splice(line - 1, 1);
        //重置多行匹配对象的行号
        this.resetDoneRegLine(line - 1);
        this.pairHighlight(line - 1);
    }
    //删除多行
    _proto.deleteMutilLine = function(startPos, endPos) {
        if (startPos.line == endPos.line) {
            var str = this.linesText[startPos.line - 1];
            this.updateLine(startPos.line, str.substring(0, startPos.column) + str.substring(endPos.column));
            this.cursorPos.column = startPos.column;
        } else {
            var str = this.linesText[startPos.line - 1].substring(0, startPos.column) + this.linesText[endPos.line - 1].substring(endPos.column);
            this.updateLine(startPos.line, str);
            for (var i = startPos.line + 1; i <= endPos.line; i++) {
                this.deleteLine(startPos.line + 1);
            }
            this.cursorPos.line = startPos.line;
            this.cursorPos.column = startPos.column;
        }
        this.updateCursorPos();
    }
    _proto.resetDoneRegLine = function(index) {
        for (var i = index; i < this.linesText.length; i++) {
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
    //全选
    _proto.selectAll = function() {
        this.selection.selectText = '';
        this.$selectBg.html('');
        var width = this.$context[0].scrollWidth;
        for (var i = 1; i <= this.linesText.length; i++) {
            var px = this.posToPx(i, 0);
            this.renderRange(px.top, px.left, width);
            this.selection.selectText += this.linesText[i - 1] + '\n';
        }
        this.selection.selectText = this.selection.selectText.substring(0, this.selection.selectText.length - 1);
        this.selection.startPos = { line: 1, column: 0 };
        this.selection.endPos = { line: this.linesText.length, column: this.linesText[this.linesText.length - 1].length }
    }
    //渲染选中背景
    _proto.renderRange = function(_top, _left, _width) {
        this.$selectBg.append('<div class="select_line_bg" style="position:absolute;top:' + _top + 'px;left:' + _left + 'px;width:' + _width + 'px;height:' + this.charHight + 'px;background-color:rgba(0,0,0,0.3)"></div>');
    }
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
    window.SubJs = SubJs;
    window.Util = Util;
}($)