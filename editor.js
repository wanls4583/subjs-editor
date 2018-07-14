! function($) {
    var Util = {
        //全角符号和中文字符
        fullAngleReg: /[\x00-\x1f\x80-\xa0\xad\u1680\u180E\u2000-\u200f\u2028\u2029\u202F\u205F\u3000\uFEFF\uFFF9-\uFFFC]|[\u1100-\u115F\u11A3-\u11A7\u11FA-\u11FF\u2329-\u232A\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u303E\u3041-\u3096\u3099-\u30FF\u3105-\u312D\u3131-\u318E\u3190-\u31BA\u31C0-\u31E3\u31F0-\u321E\u3220-\u3247\u3250-\u32FE\u3300-\u4DBF\u4E00-\uA48C\uA490-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g,
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
        },
        space: function(tabsize) {
            var val = '';
            for (var tmp = 0; tmp < tabsize; tmp++) { val += ' ' };
            return val;
        }
    }
    /**
     * 文本容器类
     */
    function LinesText() {
        var content = [];
        this.getText = function(line) {
            return content[line - 1];
        }
        this.setText = function(line, txt) {
            content[line - 1] = txt;
        }
        this.add = function(line, txt) {
            content.splice(line - 1, 0, txt);
        }
        this.delete = function(line) {
            content.splice(line - 1, 1);
        }
        this.getLength = function() {
            return content.length;
        }
    }
    /**
     * 编辑器
     * @param {[object]} options [配置]
     *  options.$wrapper 容器
     *  options.tabsize tab键所占空格数
     */
    function SubJs(options) {
        options = options || {};
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
        this.linesText = new LinesText(); //所有的行
        this.linesDom = []; //行对应的dom
        this.leftNumDom = []; //行号dom
        this.cursorPos = { line: 1, column: 0 }; //光标位置
        this.selection = {};
        this.mode = window.SubJsMode && new SubJsMode(this.linesText, this.linesDom);
        this.creatContext();
        this.getCharWidth();
        this.createLeftNumBg();
        this.creatTextarea();
        this.createCrusor();
        this.createLineBg();
        this.bindEvent();
        this.bindEditorEvent();
        this.addLine(1, '');
    }
    _proto.bindEvent = function() {
        this.bindInputEvent();
        this.bindScrollEvent();
        this.bindSelectEvent();
        this.bindMenuContextEvent();
    }
    //选中事件
    _proto.bindSelectEvent = function() {
        var self = this;
        var startPx = {};
        var select = false;
        $(document).on('selectstart', function(e) {
            //阻止浏览器默认选中文字
            if(e.target != self.$textarea[0]){
                e.preventDefault();
            }
        })
        this.$wrapper.on('mousedown', function(e) {
            var rect = Util.getRect(self.$scroller[0]);
            var scrollTop = self.$scroller[0].scrollTop;
            var scrollLeft = self.$scroller[0].scrollLeft;
            var top = e.clientY - rect.top + scrollTop;
            var left = e.clientX - rect.left + scrollLeft;
            startPx = { top: top, left: left };
            if (e.button != 2) {
                self.selection.selectText = '';
                self.selection.startPos = null;
                self.selection.endPos = null;
                self.$selectBg.html('');
                select = true;
                self.$textWrap.css({
                    'z-index': -1
                });
            }
        });
        this.$wrapper.on('mousemove', function(e) {
            if (select) {
                Util.nextFrame(function(){
                    var rect = Util.getRect(self.$scroller[0]);
                    var scrollTop = self.$scroller[0].scrollTop;
                    var scrollLeft = self.$scroller[0].scrollLeft;
                    var top = e.clientY - rect.top + scrollTop;
                    var left = e.clientX - rect.left + scrollLeft;
                    var endPx = { top: top, left: left };
                    var startPos = self.pxToPos(startPx.top, startPx.left);
                    var endPos = self.pxToPos(endPx.top, endPx.left);
                    //处理顺序
                    if (startPos.line > endPos.line) {
                        var tmp = startPos;
                        startPos = endPos;
                        endPos = tmp;
                    } else if (startPos.line == endPos.line && startPos.column > endPos.column) {
                        var tmp = startPos.column;
                        startPos.column = endPos.column;
                        endPos.column = tmp;
                    }
                    if(startPos.line < endPos.line || startPos.line == endPos.line && Math.abs(endPx.left - startPx.left) > self.charWidth){
                        self.updateSelectBg(startPos,endPos);
                    }
                })
            }
        });
        $(document).on('mouseup', function(e) {
            select = false;
        })
    }
    //menuContext事件
    _proto.bindMenuContextEvent = function() {
        var self = this;
        this.$context.on('mouseup', function(e) {
            var rect = Util.getRect(self.$scroller[0]);
            var top = e.clientY - rect.top + self.$scroller[0].scrollTop;
            var _px = self.pxToPos(top, e.clientX - rect.left + self.$scroller[0].scrollLeft);
            var line = _px.line;
            var column = _px.column;
            if (e.button != 2) { //单纯的点击
                self.cursorPos.line = line;
                self.cursorPos.column = column;
                self.$textarea[0].focus();
                self.updateCursorPos();
            } else {
                //右键时把输入框层置顶，利用点击穿透原理，弹出texarea复制粘贴菜单
                self.$textWrap.css({
                    'z-index': 4
                });
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
            select = false;
        });
    }
    //copy,cut,paste事件
    _proto.bindEditorEvent = function() {
        var self = this;
        this.$textarea.on('copy', function() {
            self.copyText = self.selection.selectText;
            self.$textarea.val(self.copyText);
            self.$textarea.select();
        })
        this.$textarea.on('paste', function(e) {
            var copyText = '';
            if (self.selection.startPos) {
                self.deleteMutilLine(self.selection.startPos, self.selection.endPos);
            }
            if (e.originalEvent.clipboardData) {
                copyText = e.originalEvent.clipboardData.getData('text');
            }
            if (!copyText) {
                copyText = self.copyText;
            } else {
                self.copyText = copyText;
            }
            if (copyText) {
                self.insertOnLine(self.copyText);
            }
        })
        this.$textarea.on('cut', function() {
            self.copyText = self.selection.selectText;
            self.$textarea.val(self.copyText);
            self.$textarea.select();
            if (self.selection.startPos) {
                self.deleteMutilLine(self.selection.startPos, self.selection.endPos);
            }
        })
        this.$textarea.on('select', function() {
            //全选
            if (Util.getSelectedText() == self.selectAllText) {
                self.selectAll();
                self.$textarea.val(''); //防止下次触发全选
            }
        })
        this.$textarea.on('mouseup', function(e) {})
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
                        if (self.selection.startPos) {
                            self.cursorPos.line = self.selection.startPos.line;
                            self.cursorPos.column = self.selection.startPos.column;
                            self.$selectBg.html('');
                            self.selection = {};
                        } else if (self.cursorPos.column > 0) {
                            self.cursorPos.column--;
                        } else if (self.cursorPos.line > 1) {
                            self.cursorPos.line--;
                            self.cursorPos.column = self.linesText.getText(self.cursorPos.line).length;
                        }
                        break;
                    case 38: //up arrow
                        if (self.selection.startPos) {
                            self.cursorPos.line = self.selection.startPos.line;
                            self.cursorPos.column = self.selection.startPos.column;
                            self.$selectBg.html('');
                            self.selection = {};
                        } else if (self.cursorPos.line > 1) {
                            self.cursorPos.line--;
                            self.cursorPos.column = self.pxToPos(self.cursorPos.line, self.cursorPos.left, true).column;
                        }
                        break;
                    case 39: //right arrow
                        if (self.selection.startPos) {
                            self.cursorPos.line = self.selection.endPos.line;
                            self.cursorPos.column = self.selection.endPos.column;
                            self.$selectBg.html('');
                            self.selection = {};
                        } else if (self.cursorPos.column < self.linesText.getText(self.cursorPos.line).length) {
                            self.cursorPos.column++;
                        } else if (self.cursorPos.line < self.linesText.getLength()) {
                            self.cursorPos.line++;
                            self.cursorPos.column = 0;
                        }
                        break;
                    case 40: //down arrow
                        if (self.selection.startPos) {
                            self.cursorPos.line = self.selection.endPos.line;
                            self.cursorPos.column = self.selection.endPos.column;
                            self.$selectBg.html('');
                            self.selection = {};
                        } else if (self.cursorPos.line < self.linesText.getLength()) {
                            self.cursorPos.line++;
                            self.cursorPos.column = self.pxToPos(self.cursorPos.line, self.cursorPos.left, true).column;
                        }
                        break;
                    case 46: //delete
                        if (self.selection.startPos) {
                            self.deleteMutilLine(self.selection.startPos, self.selection.endPos);
                        } else {
                            var str = self.linesText.getText(self.cursorPos.line);
                            str = str.substring(0, self.cursorPos.column) + str.substr(self.cursorPos.column + 1);
                            self.updateLine(self.cursorPos.line, str);
                        }
                        break;
                    case 8: //backspace
                        if (self.selection.startPos) {
                            self.deleteMutilLine(self.selection.startPos, self.selection.endPos);
                        } else {
                            var str = self.linesText.getText(self.cursorPos.line);
                            str = str.substring(0, self.cursorPos.column - 1) + str.substr(self.cursorPos.column);
                            if (self.cursorPos.column > 0) {
                                self.cursorPos.column--;
                                self.updateLine(self.cursorPos.line, str);
                            } else if (self.cursorPos.line > 1) {
                                var column = self.linesText.getText(self.cursorPos.line - 1).length;
                                self.updateLine(self.cursorPos.line - 1, self.linesText.getText(self.cursorPos.line - 1) + self.linesText.getText(self.cursorPos.line));
                                self.deleteLine(self.cursorPos.line);
                                self.cursorPos.column = column;
                                self.cursorPos.line--;
                            }
                        }
                        break;
                    case 13: //换行
                    case 108: //数字键换行
                        if (self.selection.startPos) {
                            self.deleteMutilLine(self.selection.startPos, self.selection.endPos);
                        }
                        var str = self.linesText.getText(self.cursorPos.line);
                        self.updateLine(self.cursorPos.line, str.substring(0, self.cursorPos.column));
                        self.addLine(self.cursorPos.line + 1, str.substr(self.cursorPos.column));
                        self.cursorPos.line++;
                        self.cursorPos.column = 0;
                        break;
                    case 9: //tab
                        e.preventDefault();
                        //选中区域全体移动
                        if (self.selection.startPos) {
                            var startPos = self.selection.startPos,
                                endPos = self.selection.endPos,
                                space = Util.space(self.options.tabsize);
                            for (var i = startPos.line; i <= endPos.line; i++) {
                                if (!e.shiftKey) { //想后移动
                                    self.linesDom[i - 1].find('.code').prepend(space);
                                    self.linesText.setText(i, space + self.linesText.getText(i));
                                } else { //像前移动
                                    _shiftTab(i);
                                }
                            }
                            if(!e.shiftKey){
                                startPos.column += 4;
                                endPos.column +=4;
                                self.updateSelectBg(startPos,endPos);
                            }else{
                                startPos.column = startPos.column - 4 >= 0 ? startPos.column - 4 : 0;
                                endPos.column = endPos.column - 4 >= 0 ? endPos.column - 4 : 0;
                                self.updateSelectBg(startPos,endPos);
                            }
                        } else {
                            if (!e.shiftKey) {
                                var val = Util.space(self.options.tabsize);
                                self.insertOnLine(val);
                            } else {
                                _shiftTab(self.cursorPos.line)
                            }
                        }
                        break;
                    default:
                        if (preCode > 222 && e.keyCode == 16) { //中文输入后shift延迟较大
                            setTimeout(function() {
                                _insertOnLine();
                            }, 150);
                        } else {
                            setTimeout(function() {
                                _insertOnLine();
                            }, 0)
                        }
                }
            }

            function _insertOnLine() {
                var val = self.$textarea.val();
                if (val) {
                    if (self.selection.startPos) {
                        self.deleteMutilLine(self.selection.startPos, self.selection.endPos);
                    }
                    self.insertOnLine(val);
                }
            }

            function _shiftTab(line) {
                var hl = self.linesDom[line - 1].find('.code').html();
                if (hl.indexOf('    ') == 0) {
                    self.linesDom[line - 1].find('.code').html(hl.substr(4));
                    self.linesText.setText(line, self.linesText.getText(line).substr(4));
                    if (line == self.cursorPos.line) {
                        self.cursorPos.column -= 4;
                    }
                } else if (hl.indexOf('   ') == 0) {
                    self.linesDom[line - 1].find('.code').html(hl.substr(3));
                    self.linesText.setText(line, self.linesText.getText(line).substr(3));
                    if (line == self.cursorPos.line) {
                        self.cursorPos.column -= 3;
                    }
                } else if (hl.indexOf('  ') == 0) {
                    self.linesDom[line - 1].find('.code').html(hl.substr(2));
                    self.linesText.setText(line, self.linesText.getText(line).substr(2));
                    if (line == self.cursorPos.line) {
                        self.cursorPos.column -= 2;
                    }
                } else if (hl.indexOf(' ') == 0) {
                    self.linesDom[line - 1].find('.code').html(hl.substr(1));
                    self.linesText.setText(line, self.linesText.getText(line).substr(1));
                    if (line == self.cursorPos.line) {
                        self.cursorPos.column -= 1;
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
        this.$scroller = $('<div class="editor_scroller" style="position:relative;z-index:3;overflow:auto;height:100%;padding:5px 0 0 5px;box-sizing:border-box">\
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
        this.$leftNumBg = $('<div class="line_num_bg" style="float:left;position:relative;left:0;top:0;z-index:2;min-height:100%;padding:5px 0;padding-bottom:' + this.charHight + 'px;box-sizing:border-box"></div>');
        this.$wrapper.prepend(this.$leftNumBg);
    }
    //创建输入框
    _proto.creatTextarea = function() {
        var self = this;
        var wrapStyle = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:-1;overflow:hidden;opacity:0;'
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
        this.$lineBg = $('<div class="current_line_bg" style="display:none;position:absolute;top:5px;left:40px;right:0;z-index:1;height:' + this.charHight + 'px"></div>');
        this.$wrapper.append(this.$lineBg);
    }
    //创建光标
    _proto.createCrusor = function() {
        this.$cursor = $('<i class="cursor" style="display:none;position:absolute;top:0;width:2px;height:' + this.charHight + 'px;background-color:#333"></i>');
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
        this.$lineBg.css({
            top: pos.top + 'px',
        });
        this.cursorPos.top = pos.top;
        this.cursorPos.left = pos.left;
        if (!this.selection.selectText || this.selection.startPos.line == this.selection.endPos.line) {
            this.$lineBg.show();
        } else {
            this.$lineBg.hide();
        }
        this.$leftNumBg.find('.active').removeClass('active');
        this.leftNumDom[this.cursorPos.line - 1].addClass('active');
        this.updateScroll();
    }
    _proto.updateScroll = function() {
        var context = this.$scroller[0];
        var cRect = Util.getRect(this.$cursor[0]);
        var lRect = Util.getRect(this.$leftNumBg[0]);
        if (cRect.offsetTop <= this.$scroller[0].scrollTop) {
            context.scrollTop = cRect.offsetTop;
        } else if (cRect.offsetTop + this.charHight + 24 >= context.scrollTop + this.$wrapper[0].clientHeight) {
            //为滚动条预留24px
            context.scrollTop = cRect.offsetTop + this.charHight + 24 - this.$wrapper[0].clientHeight;
        }
        if (cRect.offsetLeft - this.charWidth <= context.scrollLeft) {
            context.scrollLeft = cRect.offsetLeft - this.charWidth;
        } else if (cRect.offsetLeft + this.charWidth * 2 + 24 >= context.scrollLeft + (this.$wrapper[0].clientWidth - context.offsetLeft)) {
            //为滚动条预留24px
            context.scrollLeft = cRect.offsetLeft + this.charWidth * 2 + 24 - (this.$wrapper[0].clientWidth - context.offsetLeft);
        }
        this.$leftNumBg.css('top', -context.scrollTop + 'px');
    }
    //渲染选中背景
    _proto.updateSelectBg = function(startPos,endPos) {
        var self = this;
        var rect = Util.getRect(self.$scroller[0]);
        self.$selectBg.html('');
        self.selection.startPos = startPos;
        self.selection.endPos = endPos;
        if (startPos.line == endPos.line) {
            var str = self.linesText.getText(startPos.line);
            var width = Util.getStrWidth(str, self.charWidth, self.fullAngleCharWidth, startPos.column, endPos.column);
            var px = self.posToPx(startPos.line, startPos.column);
            self.renderRange(px.top, px.left, width);
            self.selection.selectText = str.substring(startPos.column, endPos.column);
            self.$lineBg.hide(); //隐藏当前行背景
        } else {
            var str = self.linesText.getText(startPos.line);
            var maxWidth = self.$context[0].scrollWidth;
            var width = Util.getStrWidth(str, self.charWidth, self.fullAngleCharWidth, 0, startPos.column);
            var px = self.posToPx(startPos.line, startPos.column);
            self.renderRange(px.top, px.left, maxWidth - width);
            self.selection.selectText = str;
            for (var l = startPos.line + 1; l < endPos.line; l++) {
                px = self.posToPx(l, 0);
                self.renderRange(px.top, rect.paddingLeft, maxWidth);
                self.selection.selectText += '\n' + self.linesText.getText(l);
            }
            str = self.linesText.getText(endPos.line);
            width = Util.getStrWidth(str, self.charWidth, self.fullAngleCharWidth, 0, endPos.column);
            px = self.posToPx(endPos.line, 0);
            self.renderRange(px.top, px.left, width);
            self.selection.selectText += '\n' + str.substring(0, endPos.column);
            self.$lineBg.hide(); //隐藏当前行背景
        }
    }
    _proto.posToPx = function(line, column) {
        var self = this;
        var top = (line - 1) * this.charHight;
        var str = this.linesText.getText(line).substring(0, column);
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
        if (line > this.linesText.getLength()) {
            line = this.linesText.getLength();
            column = this.linesText.getText(this.linesText.getLength()).length;
        } else {
            var str = this.linesText.getText(line);
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
                    var str = this.linesText.getText(line).substring(0, column);
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
        this.linesText.setText(line, newConent);
        if (this.mode) {
            this.mode.onUpdateLine(line);
        } else {
            this.linesDom[line - 1].html(newConent);
        }
    }
    //插入内容
    _proto.insertOnLine = function(val) {
        var str = this.linesText.getText(this.cursorPos.line);
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
        this.linesText.add(line, newConent);
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
        var $num = $('<span class="line_num">' + this.linesText.getLength() + '</span>')
        $num.css({
            'display': 'block',
            'height': this.charHight + 'px',
            'line-height': this.charHight + 'px',
            'padding-right': '15px',
            'padding-left': '15px',
            'user-select': 'none',
            'text-align': 'right',
            'font-size': this.fontSize
        })
        this.$leftNumBg.append($num);
        this.leftNumDom.push($num);
        this.linesDom.splice(line - 1, 0, $dom);
        if (this.mode) {
            this.mode.onAddLine(line);
        }
    }
    //删除一行
    _proto.deleteLine = function(line) {
        this.linesText.delete(line);
        this.linesDom[line - 1].remove();
        this.linesDom.splice(line - 1, 1);
        this.leftNumDom[this.leftNumDom.length - 1].remove();
        this.leftNumDom.splice(this.leftNumDom.length - 1, 1);
        if (this.mode) {
            this.mode.onDeleteLine(line);
        }
    }
    //删除多行
    _proto.deleteMutilLine = function(startPos, endPos) {
        if (startPos.line == endPos.line) {
            var str = this.linesText.getText(startPos.line);
            this.updateLine(startPos.line, str.substring(0, startPos.column) + str.substring(endPos.column));
            this.cursorPos.column = startPos.column;
        } else {
            var str = this.linesText.getText(startPos.line).substring(0, startPos.column) + this.linesText.getText(endPos.line).substring(endPos.column);
            this.updateLine(startPos.line, str);
            for (var i = startPos.line + 1; i <= endPos.line; i++) {
                this.deleteLine(startPos.line + 1);
            }
            this.cursorPos.line = startPos.line;
            this.cursorPos.column = startPos.column;
        }
        this.$selectBg.html('');
        this.selection = {};
        this.updateCursorPos();
    }
    //全选
    _proto.selectAll = function() {
        this.selection.selectText = '';
        this.$selectBg.html('');
        var width = this.$context[0].scrollWidth;
        if (this.linesText.getLength() > 1) {
            for (var i = 1; i <= this.linesText.getLength() - 1; i++) {
                var px = this.posToPx(i, 0);
                this.renderRange(px.top, px.left, width);
                this.selection.selectText += this.linesText.getText(i) + '\n';
            }
        }
        var line = this.linesText.getLength();
        var width = Util.getStrWidth(this.linesText.getText(line), this.charWidth, this.fullAngleCharWidth, 0, this.linesText.getText(line).length);
        var px = this.posToPx(line, 0);
        this.renderRange(px.top, px.left, width);
        this.selection.selectText += this.linesText.getText(line);
        this.selection.startPos = { line: 1, column: 0 };
        this.selection.endPos = { line: line, column: this.linesText.getText(line).length }
    }
    //渲染选中背景
    _proto.renderRange = function(_top, _left, _width) {
        this.$selectBg.append('<div class="selection_line_bg" style="position:absolute;top:' + _top + 'px;left:' + _left + 'px;width:' + _width + 'px;height:' + this.charHight + 'px;background-color:rgb(181, 213, 255)"></div>');
    }
    window.SubJs = SubJs;
}($, window)