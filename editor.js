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
        pxToNum: function(px) {
            return parseInt(px.substring(0, px.length - 2))
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
            _pt = this.pxToNum(_pt);
            var _pb = Util.getStyleVal(dom, 'paddingBottom');
            _pb = this.pxToNum(_pb);
            var _pl = this.getStyleVal(dom, 'paddingLeft');
            _pl = this.pxToNum(_pl);
            var _pr = this.getStyleVal(dom, 'paddingRight');
            _pr = this.pxToNum(_pr);
            var _mt = this.getStyleVal(dom, 'marginTop');
            _mt = this.pxToNum(_mt);
            var _mb = Util.getStyleVal(dom, 'marginBottom');
            _mb = this.pxToNum(_mb);
            var _ml = this.getStyleVal(dom, 'marginLeft');
            _ml = this.pxToNum(_ml);
            var _mr = this.getStyleVal(dom, 'marginRight');
            _mr = this.pxToNum(_mr);
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
        },
        sortNum: function(arr) {
            arr.sort(function(arg1, arg2) {
                return Number(arg1) - Number(arg2);
            })
        }
    }
    /**
     * 文本容器类
     */
    function LinesText() {
        var _content = [];
        var _width = [];
        this.getText = function(line) {
            return _content[line - 1];
        }
        this.setText = function(line, txt) {
            _content[line - 1] = txt;
            _width[line - 1] = Util.getStrWidth(txt, SubJs.charWidth, SubJs.fullAngleCharWidth);
            Util.sortNum(_width);
        }
        this.add = function(line, txt) {
            _content.splice(line - 1, 0, txt);
            _width.splice(line - 1, 0, 0);
            _width[line - 1] = Util.getStrWidth(txt, SubJs.charWidth, SubJs.fullAngleCharWidth);
            Util.sortNum(_width);
        }
        this.delete = function(line) {
            _content.splice(line - 1, 1);
            _width.splice(line - 1, 1);
        }
        this.getLength = function() {
            return _content.length;
        }
        this.getMaxWidth = function() {
            if (!_width.length) {
                return 0;
            }
            return _width[_width.length - 1];
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
        this.firstLine = 0;
        this.mode = window.SubJsMode && new SubJsMode(this.linesText, this.linesDom);
        this.creatContext();
        this.getCharWidth();
        this.createLeftNumBg();
        this.creatTextarea();
        this.createCrusor();
        this.createLineBg();
        this.createScrollBar();
        this.bindEvent();
        this.bindEditorEvent();
        this.addLine(1, '');
        this.mount(1);
        this.updateCursorPos();
    }
    _proto.bindEvent = function() {
        this.bindInputEvent();
        this.bindScrollEvent();
        this.bindSelectEvent();
        this.bindMenuContextEvent();
    }
    //获取字符宽度
    _proto.getCharWidth = function() {
        var str1 = 'XXXXXXXXXXXXXX';
        var str2 = '啊啊啊啊啊啊啊啊';
        this.$context[0].innerHTML = '<span style="display:inline-block" class="char_width_1">' + str1 + '</span><span style="display:inline-block" class="char_width_2">' + str2 + '</span>';
        var dom = $('.char_width_1')[0];
        SubJs.charWidth = dom.clientWidth / str1.length;
        SubJs.charHight = dom.clientHeight;
        SubJs.fullAngleCharWidth = $('.char_width_2')[0].clientWidth / str2.length;
        this.fontSize = window.getComputedStyle ? window.getComputedStyle(dom, null).fontSize : dom.currentStyle.fontSize;
        this.$context[0].innerHTML = '';
        this.maxVisualLine = Math.ceil(this.$context[0].clientHeight / SubJs.charHight) + 1;
        console.log('charSize', SubJs.charWidth, SubJs.fullAngleCharWidth, SubJs.charHight);
    }
    //输入框区域
    _proto.creatContext = function() {
        this.$scroller = $('<div class="editor_scroller" style="position:relative;z-index:3;overflow:hidden;height:100%;padding:5px 0 0 5px;box-sizing:border-box">\
                <div class="editor_context" style="position:relative;top:0;min-height:100%;cursor:text;"></div>\
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
        this.$leftNumBg = $('<div class="line_num_bg" style="float:left;position:relative;left:0;top:0;z-index:2;min-height:100%;padding:5px 0;padding-bottom:' + SubJs.charHight + 'px;box-sizing:border-box"></div>');
        this.$wrapper.prepend(this.$leftNumBg);
        for (var i = 1; i <= this.maxVisualLine; i++) {
            var $num = $('<span class="line_num">' + this.linesText.getLength() + '</span>')
            $num.css({
                'display': 'block',
                'height': SubJs.charHight + 'px',
                'line-height': SubJs.charHight + 'px',
                'padding-right': '15px',
                'padding-left': '15px',
                'user-select': 'none',
                'text-align': 'right'
            })
            this.leftNumDom.push($num);
        }
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
        this.$lineBg = $('<div class="current_line_bg" style="display:none;position:absolute;top:5px;left:40px;right:0;z-index:1;height:' + SubJs.charHight + 'px"></div>');
        this.$wrapper.append(this.$lineBg);
    }
    //创建光标
    _proto.createCrusor = function() {
        this.$cursor = $('<i class="cursor" style="display:none;position:absolute;top:0;width:2px;height:' + SubJs.charHight + 'px;background-color:#333"></i>');
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
    //创建纵向滚动条
    _proto.createScrollBar = function() {
        this.$vScrollWrap = $('<div class="v_scrollbar_wrap" style="position:absolute;top:0;bottom:0;right:0;z-index:4;overflow:auto;width:22px;padding-top:5px"><div class="v_scrollbar"></div></div>');
        this.$hScrollWrap = $('<div class="h_scrollbar_wrap" style="position:absolute;left:0;right:0;bottom:0;z-index:4;overflow:auto;height:22px;padding-left:5px"><div class="h_scrollbar" style="height:100%"></div></div>');
        this.$vScrollBar = this.$vScrollWrap.find('.v_scrollbar');
        this.$hScrollBar = this.$hScrollWrap.find('.h_scrollbar');
        this.$wrapper.append(this.$vScrollWrap);
        this.$wrapper.append(this.$hScrollWrap);
    }
    /**
     * 将行列坐标转换成像素坐标（相对于scroller容器）
     * @param  {number} line   行号
     * @param  {number} column 列号
     * @return {object}        top,left
     */
    _proto.posToPx = function(line, column) {
        var self = this;
        var top = (line - this.firstLine) * SubJs.charHight + Util.pxToNum(Util.getStyleVal(this.$context[0], 'top'));
        var str = this.linesText.getText(line).substring(0, column);
        var match = str.match(Util.fullAngleReg);
        var left = str.length * SubJs.charWidth;
        var rect = Util.getRect(this.$scroller[0]);
        if (match) {
            left += match.length * (SubJs.fullAngleCharWidth - SubJs.charWidth);
        }
        return {
            top: top + rect.paddingTop,
            left: left + rect.paddingLeft
        }
    }
    /**
     * 将像素坐标转换成行列坐标（相对于scroller容器）
     * @param  {number} top    相对scrolller顶部的距离
     * @param  {number} column 相对scroller左边框的距离
     * @return {object}        {line,column}
     */
    _proto.pxToPos = function(top, left, ifLine) {
        var column = this.cursorPos.column;
        var rect = Util.getRect(this.$scroller[0]);
        var line = top;
        left -= rect.paddingLeft;
        if (!ifLine) {
            top = top - rect.paddingTop - Util.pxToNum(Util.getStyleVal(this.$context[0], 'top'));
            line = Math.ceil(top / SubJs.charHight);
        }
        line = line < 1 ? 1 : line;
        line = line + this.firstLine - 1;
        if (line > this.linesText.getLength()) {
            line = this.linesText.getLength();
            column = this.linesText.getText(this.linesText.getLength()).length;
        } else {
            var str = this.linesText.getText(line);
            column = Math.ceil(left / SubJs.charWidth);
            column = column < 0 ? 0 : column;
            column = column > str.length ? str.length : column;
            var match = str.match(Util.fullAngleReg);
            var maxWidth = str.length * SubJs.charWidth;
            if (match) {
                maxWidth += match.length * (SubJs.fullAngleCharWidth - SubJs.charWidth);
            }
            if (left > maxWidth) {
                left = maxWidth;
            } else {
                while (column > 0) {
                    var str = this.linesText.getText(line).substring(0, column);
                    var match = str.match(Util.fullAngleReg);
                    var _left = str.length * SubJs.charWidth;
                    if (match) {
                        _left += match.length * (SubJs.fullAngleCharWidth - SubJs.charWidth);
                    }
                    if (Math.abs(_left - left) < SubJs.charWidth) {
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
    //更新光标坐标
    _proto.updateCursorPos = function() {
        var pos = this.posToPx(this.cursorPos.line, this.cursorPos.column);
        var scrollTop = this.$vScrollWrap[0].scrollTop;
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
        this.leftNumDom[this.cursorPos.line - this.firstLine].addClass('active');
        this.updateScroll();
    }
    _proto.updateScroll = function() {
        var scroller = this.$scroller[0],
            context = this.$context[0],
            cRect = Util.getRect(this.$cursor[0]),
            lRect = Util.getRect(this.$leftNumBg[0]),
            top = this.posToPx(this.cursorPos.line, 0).top,
            hBarHeight = 0,
            vBarWidth = 0,
            realBarWidth = 0;
        //设置横向滚动条左边距离
        this.$hScrollWrap.css({
            left: scroller.offsetLeft + 'px'
        })
        //设置纵向滚动条高度
        this.$vScrollBar.css({
            height: this.linesText.getLength() * SubJs.charHight + 'px'
        })
        if(this.$vScrollWrap[0].scrollHeight > this.$vScrollWrap[0].clientHeight){
            vBarWidth = 22;
        }
        //设置编辑区宽度
        this.$context.css({
            'min-width': this.linesText.getMaxWidth() + vBarWidth + 15 + 'px'
        })
        //横线滚动条会占用一定高度
        if (scroller.scrollWidth > scroller.clientWidth) {
            hBarHeight = 22;
        }
        //出现横向滚动条后，纵向滚动条高度缩短22px
        if (Util.pxToNum(Util.getStyleVal(this.$vScrollWrap[0], 'bottom')) == 0 && hBarHeight) {
            //获取真实滚动条宽度
            realBarWidth = this.$vScrollWrap[0].offsetWidth - this.$vScrollWrap[0].clientWidth;
            this.$vScrollWrap.css({
                bottom: realBarWidth + 'px'
            })
        }
        //出现纵向滚动条后，横向滚动条高度缩短22px
        if (Util.pxToNum(Util.getStyleVal(this.$hScrollWrap[0], 'right')) == 0 && vBarWidth) {
            if(!realBarWidth){
                realBarWidth = this.$hScrollWrap[0].offsetHeight - this.$hScrollWrap[0].clientHeight;
            }
            this.$hScrollWrap.css({
                right: realBarWidth + 'px'
            })
        }
        //设置横向滚动条宽度度
        this.$hScrollBar.css({
            width:  context.scrollWidth - 1 - 2*realBarWidth + 'px'
        })
        //光标超出可视区域最大高度之外
        if (top + SubJs.charHight > context.clientHeight) {
            var line = this.cursorPos.line - Math.ceil(context.clientHeight % SubJs.charHight);
            var scrollTop = line * SubJs.charHight;
            if (context.clientHeight % SubJs.charHight) {
                scrollTop += (SubJs.charHight - context.clientHeight % SubJs.charHight);
            }
            this.$vScrollWrap[0].scrollTop = scrollTop;
        }
        //光标超出可视区域最大宽度之外
        if (cRect.offsetLeft - SubJs.charWidth <= this.$hScrollWrap.scrollLeft) {
            this.$hScrollWrap[0].scrollLeft = cRect.offsetLeft - SubJs.charWidth;
        } else if (cRect.offsetLeft + SubJs.charWidth * 2 + vBarWidth > scroller.clientWidth) {
            var str = this.linesText.getText(this.cursorPos.line);
            str = str.substring(0,this.cursorPos.column+1);
            this.$hScrollWrap[0].scrollLeft = Util.getStrWidth(str,SubJs.charWidth,SubJs.fullAngleCharWidth) - scroller.clientWidth; 
        }
    }
    //渲染选中背景
    _proto.updateSelectBg = function(startPos, endPos) {
        var self = this;
        var rect = Util.getRect(self.$scroller[0]);
        self.$selectBg.html('');
        self.selection.startPos = startPos;
        self.selection.endPos = endPos;
        if (startPos.line == endPos.line) {
            var str = self.linesText.getText(startPos.line);
            var width = Util.getStrWidth(str, SubJs.charWidth, SubJs.fullAngleCharWidth, startPos.column, endPos.column);
            var px = self.posToPx(startPos.line, startPos.column);
            self.renderRange(px.top, px.left, width);
            self.selection.selectText = str.substring(startPos.column, endPos.column);
            self.$lineBg.hide(); //隐藏当前行背景
        } else {
            var str = self.linesText.getText(startPos.line);
            var maxWidth = self.$context[0].scrollWidth - 1; //防止$context真实宽度有小数（scrollWidth将被四舍五入）
            var width = Util.getStrWidth(str, SubJs.charWidth, SubJs.fullAngleCharWidth, 0, startPos.column);
            var px = self.posToPx(startPos.line, startPos.column);
            self.renderRange(px.top, px.left, maxWidth - width);
            self.selection.selectText = str;
            for (var l = startPos.line + 1; l < endPos.line; l++) {
                px = self.posToPx(l, 0);
                self.renderRange(px.top, rect.paddingLeft, maxWidth);
                self.selection.selectText += '\n' + self.linesText.getText(l);
            }
            str = self.linesText.getText(endPos.line);
            width = Util.getStrWidth(str, SubJs.charWidth, SubJs.fullAngleCharWidth, 0, endPos.column);
            px = self.posToPx(endPos.line, 0);
            self.renderRange(px.top, px.left, width);
            self.selection.selectText += '\n' + str.substring(0, endPos.column);
            self.$lineBg.hide(); //隐藏当前行背景
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
        this.updateLine(this.cursorPos.line, strs[0]);
        for (var tmp = 1; tmp < strs.length; tmp++) { //粘贴操作可能存在换号符
            this.addLine(this.cursorPos.line + tmp, strs[tmp]);
        }
        var firstLine = this.firstLine;
        if (this.cursorPos.line - this.firstLine + strs.length > this.maxVisualLine) {
            firstLine = this.cursorPos.line + strs.length - this.maxVisualLine;
        }
        this.mount(firstLine);
        this.cursorPos.line = this.cursorPos.line + strs.length - 1;
        this.cursorPos.column = strs[strs.length - 1].length;
        this.updateCursorPos();
    }
    _proto.addLine = function(line, newConent) {
        this.linesText.add(line, newConent);
        var $dom = $('\
            <div style="position:relative;margin:0;height:' + SubJs.charHight + 'px;" class="pre_code_line">\
                <div class="code" style="display:inline-block;position:relative;height:100%;min-width:100%;white-space:pre"></div>\
            </div>');
        this.linesDom.splice(line - 1, 0, $dom);
    }
    //删除一行
    _proto.deleteLine = function(line) {
        this.linesText.delete(line);
        this.linesDom[line - 1].remove();
        this.linesDom.splice(line - 1, 1);
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
    /**
     * 更新行号
     * @param  {number} firstLine 首行
     */
    _proto.updateNum = function(firstLine) {
        var allDom = this.$context.find('.pre_code_line');
        for (var i = 0; i < allDom.length; i++) {
            this.leftNumDom[i].html(firstLine + i);
            if (!this.leftNumDom[i][0].isConnected) {
                this.$leftNumBg.append(this.leftNumDom[i]);
            }
        }
        for (var i = allDom.length; i < this.leftNumDom.length; i++) {
            this.leftNumDom[i].remove();
        }
    }
    /**
     * 挂载dom
     * @param  {number} firstLine 首行序号
     */
    _proto.mount = function(firstLine) {
        var self = this,
            firstDom = this.linesDom[firstLine - 1],
            allDom = null;
        //删除可视区域之前的元素
        for (var i = this.firstLine; i > 0 && i < firstLine; i++) {
            this.linesDom[i - 1].remove();
        }
        //当过小于当前首行，则在其前插入
        if (firstLine < this.firstLine) {
            for (var i = firstLine; i < this.firstLine; i++) {
                _hightlight(i);
                this.linesDom[i - 1].insertBefore(this.linesDom[this.firstLine - 1]);
            }
        }
        var allDom = this.$context.find('.pre_code_line');
        //如果当前可视区域的元素少于最大可见个数，则在尾部追加
        if (allDom.length < this.maxVisualLine) {
            for (var i = firstLine + allDom.length; this.linesDom[i - 1] && i < firstLine + this.maxVisualLine; i++) {
                _hightlight(i);
                this.$context.append(this.linesDom[i - 1]);
            }
        }
        allDom = this.$context.find('.pre_code_line');
        //可视区域元素个数大于最大可见个数，需要删除
        for (var i = allDom.length; i > this.maxVisualLine; i--) {
            allDom[i - 1].remove();
        }
        this.updateNum(firstLine);
        this.firstLine = firstLine;

        function _hightlight(line) {
            if (self.mode && !self.linesDom[line - 1].hasHightLight) {
                self.mode.onAddLine(line);
                self.linesDom[line - 1].hasHightLight = true;
            }
        }
    }
    //全选
    _proto.selectAll = function() {
        var startPos = { line: 1, column: 0 };
        var endPos = { line: this.linesText.getLength(), column: this.linesText.getText(this.linesText.getLength()).length }
        this.updateSelectBg(startPos, endPos);
    }
    //渲染选中背景
    _proto.renderRange = function(_top, _left, _width) {
        this.$selectBg.append('<div class="selection_line_bg" style="position:absolute;top:' + _top + 'px;left:' + _left + 'px;width:' + _width + 'px;height:' + SubJs.charHight + 'px;background-color:rgb(181, 213, 255)"></div>');
    }
    //选中事件
    _proto.bindSelectEvent = function() {
        var self = this;
        var startPx = {};
        var select = false;
        $(document).on('selectstart', function(e) {
            //阻止浏览器默认选中文字
            if (e.target != self.$textarea[0]) {
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
                Util.nextFrame(function() {
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
                    if (startPos.line < endPos.line || startPos.line == endPos.line && Math.abs(endPx.left - startPx.left) > SubJs.charWidth) {
                        self.updateSelectBg(startPos, endPos);
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
        this.$vScrollWrap.on('scroll', function(e) {
            var firstLine = Math.ceil(this.scrollTop / SubJs.charHight);
            firstLine = firstLine < 1 ? 1 : firstLine;
            self.$context.css({
                top: -this.scrollTop % SubJs.charHight + 'px'
            })
            self.$leftNumBg.css({
                top: -this.scrollTop % SubJs.charHight + 'px'
            })
            self.mount(firstLine);
        })
        this.$wrapper.on('mousewheel', function(e) {
            self.$vScrollWrap[0].scrollTop += e.originalEvent.deltaY;
        })
        this.$hScrollWrap.on('scroll',function(){
            self.$scroller[0].scrollLeft = this.scrollLeft;
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
                            self.cursorPos.column = self.pxToPos(self.cursorPos.top, self.cursorPos.left, true).column;
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
                            self.cursorPos.column = self.pxToPos(self.cursorPos.top, self.cursorPos.left, true).column;
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
                            if (!e.shiftKey) {
                                startPos.column += 4;
                                endPos.column += 4;
                                self.updateSelectBg(startPos, endPos);
                            } else {
                                startPos.column = startPos.column - 4 >= 0 ? startPos.column - 4 : 0;
                                endPos.column = endPos.column - 4 >= 0 ? endPos.column - 4 : 0;
                                self.updateSelectBg(startPos, endPos);
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
    window.SubJs = SubJs;
}($, window)