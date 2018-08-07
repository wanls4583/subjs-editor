/////////
// 工具类 //
/////////
class Util {
    //获取选中的文本
    static getSelectedText() {
        if (document.selection) {
            return document.selection.createRange().text;
        } else if (window.getSelection) {
            return window.getSelection().toString();
        }
    }
    /**
     * 获取样式属性计算值
     * @param  {DOM} dom
     * @param  {string} prop 样式属性
     * @return {string}      属性值
     */
    static getStyleVal(dom, prop) {
        if (window.getComputedStyle) {
            return window.getComputedStyle(dom, null)[prop];
        } else {
            return dom.currentStyle[prop]
        }
    }
    //px属性值转为整数
    static pxToNum(px) {
        return parseInt(px.substring(0, px.length - 2))
    }
    //请求下一帧
    static nextFrame(callback) {
        if (window.requestAnimationFrame) {
            return window.requestAnimationFrame(callback);
        } else {
            return setTimeout(function() {
                callback();
            }, 0);
        }
    }
    //取消下一帧
    static cancelNextFrame(id) {
        if (window.requestAnimationFrame) {
            window.cancelAnimationFrame(id);
        } else {
            clearTimeout(id);
        }
    }
    //获取margin,padding,offset(相对页面边缘)
    static getRect(dom) {
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
    }
    /**
     * 获取文本在浏览器中的真实宽度
     * @param  {string} str       文本
     * @param  {number} charW     半角符号/文字宽度
     * @param  {number} fullCharW 全角符号/文字宽度
     * @param  {number} start     文本开始索引
     * @param  {number} end       文本结束索引
     * @return {number}           文本真实宽度
     */
    static getStrWidth(str, charW, fullCharW, start, end) {
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
    //生成指定个数的空白符
    static space(tabsize) {
        var val = '';
        for (var tmp = 0; tmp < tabsize; tmp++) { val += ' ' };
        return val;
    }
    //数组数字排序
    static sortNum(arr) {
        arr.sort(function(arg1, arg2) {
            return Number(arg1) - Number(arg2);
        })
    }
    //获取滚动条宽度
    static getScrBarWidth() {
        if (!this.scrBarWidth) {
            var wrap = $('<div style="height:30px;width:30px;overflow:auto"><div style="height:100px"></div></div>')
            document.body.append(wrap[0]);
            var w = wrap[0].offsetWidth - wrap[0].clientWidth;;
            wrap.remove();
            this.scrBarWidth = w;
            return w;
        }
        return this.scrBarWidth;
    }
    //<,>转义
    static htmlTrans(cont) {
        return cont.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}
//全角符号和中文字符
Util.fullAngleReg = /[\x00-\x1f\x80-\xa0\xad\u1680\u180E\u2000-\u200f\u2028\u2029\u202F\u205F\u3000\uFEFF\uFFF9-\uFFFC]|[\u1100-\u115F\u11A3-\u11A7\u11FA-\u11FF\u2329-\u232A\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u303E\u3041-\u3096\u3099-\u30FF\u3105-\u312D\u3131-\u318E\u3190-\u31BA\u31C0-\u31E3\u31F0-\u321E\u3220-\u3247\u3250-\u32FE\u3300-\u4DBF\u4E00-\uA48C\uA490-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;

///////////
// 文本容器类 //
///////////
class LinesContext {
    constructor() {
        this._content = []; //存储每行文本
        this._htmlDom = []; //存储每行文本对应的dom元素
        this._width = []; //记录每行文本的宽度
        this._maxObj = { line: 1, width: 0 }; //文本当前最大宽度
        this._findMax = false; //是否要重新计算最大宽度
        this._lineDecs = []; //存储行内修饰
        this._priorLineDecs = []; //存储高优先级行内修饰
        this._lineWholeDecs = []; //存储整行修饰
        this._engine = function(content) { return content }; //默认处理引擎直接返回传入的内容
    }
    //获取一行文本
    getText(line) {
        return this._content[line - 1];
    }
    //更新一行文本
    setText(line, txt) {
        this._content[line - 1] = txt;
        this._width[line - 1] = Util.getStrWidth(txt, Editor.charWidth, Editor.fullAngleCharWidth);
        if (this._width[line - 1] > this._maxObj.width) {
            this._maxObj.width = this._width[line - 1];
            this._maxObj.line = line;
        } else if (line == this._maxObj.line) {
            this._findMax = true;
        }
    }
    //在指定行添加一行文本
    add(line, txt) {
        this._content.splice(line - 1, 0, txt);
        this._htmlDom.splice(line - 1, 0, undefined);
        this._width.splice(line - 1, 0, 0);
        this._lineDecs.splice(line - 1, 0, []);
        this._priorLineDecs.splice(line - 1, 0, undefined);
        this._lineWholeDecs.splice(line - 1, 0, '');
        this._width[line - 1] = Util.getStrWidth(txt, Editor.charWidth, Editor.fullAngleCharWidth);
        if (this._width[line - 1] > this._maxObj.width) {
            this._maxObj.width = this._width[line - 1];
            this._maxObj.line = line;
        } else if (line == this._maxObj.line) {
            this._maxObj.line = line + 1;
        }
    }
    /**
     * 删除多行（大数据处理时提高效率）
     * @param  {Number} startLine       开始行
     * @param  {Number} endLine         结束行
     */
    delete(startLine, endLine) {
        this._content.splice(startLine - 1, endLine - startLine + 1);
        this._htmlDom.splice(startLine - 1, endLine - startLine + 1);
        this._width.splice(startLine - 1, endLine - startLine + 1);
        this._lineDecs.splice(startLine - 1, endLine - startLine + 1);
        this._priorLineDecs.splice(startLine - 1, endLine - startLine + 1);
        this._lineWholeDecs.splice(startLine - 1, endLine - startLine + 1);
        this._findMax = true;
    }
    //获取总行数
    getLength() {
        return this._content.length;
    }
    //获取文本最大宽度
    getMaxWidth() {
        if (this._findMax) {
            var max = 0;
            this._maxObj = { line: 1, width: 0 };
            for (var i = 0; i < this._width.length; i++) {
                if (this._width[i] > max) {
                    this._maxObj.line = i + 1;
                    this._maxObj.width = this._width[i];
                    max = this._width[i];
                }
            }
            this._findMax = false;
        }
        return this._maxObj.width;
    }
    //获取dom
    getDom(line) {
        if (!this._htmlDom[line - 1]) {
            var $dom = $('\
                <div style="position:relative;margin:0;height:' + Editor.charHight + 'px;" class="pre_code_line">\
                    <div class="code" style="display:inline-block;position:relative;height:100%;min-width:100%;white-space:pre"></div>\
                </div>');
            this._htmlDom[line - 1] = $dom;
        }
        return this._htmlDom[line - 1];
    }
    //更新dom
    updateDom(line) {
        var $dom = this._htmlDom[line - 1];
        $dom && ($dom.hasUpdate = false);
        //只有挂载到页面的元素才真正更新
        if ($dom && $dom[0].isConnected) {
            var wholeLineDec = this._lineWholeDecs[line - 1];
            if (wholeLineDec) {
                $dom.find('.code').html(Util.htmlTrans(this._content[line - 1]));
                $dom.find('.code').addClass(wholeLineDec);
            } else {
                $dom.find('.code').attr('class', 'code');
                $dom.find('.code').html(this._engine(this._content[line - 1], this._lineDecs[line - 1], this._priorLineDecs[line - 1]));
            }
            //设置更新标识
            if (!$dom.hasUpdate) {
                $dom.hasUpdate = true;
            }
        }
    }
    /**
     * 设置行内修饰
     * @param {Number} line       行号
     * @param {Object} decoration 修饰对象
     */
    setLineDec(line, decoration) {
        this._lineDecs[line - 1] = decoration;
    }
    /**
     * 获取行内的修饰
     * @param  {Number} line 行号
     * @return {Object}      该行对应的修饰对象
     */
    getLineDec(line) {
        return this._lineDecs[line - 1];
    }
    /**
     * 设置高优先级行内修饰
     * @param {Number} line       行号
     * @param {Object} decoration 修饰对象
     */
    setPriorLineDecs(line, decoration) {
        this._priorLineDecs[line - 1] = this._priorLineDecs[line - 1] || [];
        for (var i = 0; i < this._priorLineDecs[line - 1].length; i++) {
            if (this._priorLineDecs[line - 1][i].start == decoration.start || this._priorLineDecs[line - 1][i].end == decoration.end) {
                this._priorLineDecs[line - 1].splice(i, 1);
                i--;
            }
        }
        this._priorLineDecs[line - 1].push(decoration);
    }
    /**
     * 删除优先级行内修饰
     * @param  {[type]} line       [description]
     * @param  {[type]} decoration [description]
     * @return {[type]}            [description]
     */
    delPriorLineDecs(line, decoration) {
        this._priorLineDecs[line - 1] = this._priorLineDecs[line - 1] || [];
        for (var i = 0; i < this._priorLineDecs[line - 1].length; i++) {
            if (!this._priorLineDecs[line - 1][i]) {
                debugger;
            }
            if (this._priorLineDecs[line - 1][i].start == decoration.start && this._priorLineDecs[line - 1][i].end == decoration.end) {
                this._priorLineDecs[line - 1].splice(i, 1);
                i--;
            }
        }
    }
    /**
     * 获取高优先级行内的修饰
     * @param  {Number} line 行号
     * @return {Object}      该行对应的修饰对象
     */
    getPriorLineDecs(line) {
        return this._priorLineDecs[line - 1];
    }
    /**
     * 添加整行修饰
     * @param {Number} line       行号
     * @param {String} className  class
     */
    setWhoeLineDec(line, className) {
        this._lineWholeDecs[line - 1] = className;
    }
    /**
     * 获取整行修饰
     * @param  {Number} line 行号
     * @return {Array}       该行对应的整行修饰数组
     */
    getWholeLineDec(line) {
        return this._lineWholeDecs[line - 1];
    }
    /**
     * 设置修饰对象的处理引擎
     * @param {Function} engine 修饰对象的处理引擎
     */
    setDecEngine(engine) {
        this._engine = engine;
    }
}

////////
//编辑器 //
////////
class Editor {
    /**
     * @param {Object} option [配置]
     *  option.$wrapper 容器
     *  option.tabsize tab键所占空格数
     */
    constructor(option) {
        option = option || {};
        this.config = {}; //参数
        if (typeof option.$wrapper == 'string') {
            this.config.$wrapper = $(option.$wrapper);
        } else if (typeof option.$wrapper == 'object') {
            this.config.$wrapper = option.$wrapper;
        } else {
            return new Error('$wrapper must be string or object');
        }
        this.config.tabsize = option.tabsize || 4;
        this.linesContext = new LinesContext(); //所有的行
        this.mode = option.mode && new option.mode(this.linesContext);
        this.leftNumDom = []; //行号dom
        this.cursorPos = { line: 0, column: 0 }; //光标位置
        this.selection = {};
        this.firstLine = 1;
        this._init();
    }
    _init() {
        this.creatContext();
        this.getCharWidth();
        this.createLeftNumBg();
        this.creatTextarea();
        this.createCrusor();
        this.createLineBg();
        this.createScrollBar();
        this.bindEvent();
        this.bindEditorEvent();
        this.insertContent('\n');
    }
    bindEvent() {
        this.bindInputEvent();
        this.bindScrollEvent();
        this.bindSelectEvent();
        this.bindMenuContextEvent();
    }
    //获取字符宽度
    getCharWidth() {
        var str1 = 'XXXXXXXXXXXXXX';
        var str2 = '啊啊啊啊啊啊啊啊';
        this.$context[0].innerHTML = '<span style="display:inline-block" class="char_width_1">' + str1 + '</span><span style="display:inline-block" class="char_width_2">' + str2 + '</span>';
        var dom = $('.char_width_1')[0];
        Editor.charWidth = dom.clientWidth / str1.length;
        Editor.charHight = dom.clientHeight;
        Editor.fullAngleCharWidth = $('.char_width_2')[0].clientWidth / str2.length;
        this.fontSize = window.getComputedStyle ? window.getComputedStyle(dom, null).fontSize : dom.currentStyle.fontSize;
        this.$context[0].innerHTML = '';
        //可实区域可能显示的行的数量
        this.maxVisualLine = Math.ceil(this.$context[0].clientHeight / Editor.charHight) + 1;
        console.log('charSize', Editor.charWidth, Editor.fullAngleCharWidth, Editor.charHight);
    }
    //输入框区域
    creatContext() {
        this.$scroller = $('<div class="editor_scroller" style="position:relative;z-index:3;overflow:hidden;height:100%;padding:5px 0 0 5px;box-sizing:border-box">\
                <div class="editor_context" style="position:relative;top:0;min-height:100%;cursor:text;"></div>\
                <div class="editor_bg" style="position:absolute;left:0;top:0;z-index:-1"></div>\
            </div>');
        this.$wrapper = $('<div class="editor_wrap"></div>');
        this.$wrapper.append(this.$scroller);
        this.$context = this.$scroller.find('.editor_context');
        this.$selectBg = this.$scroller.find('.editor_bg');
        this.$wrapper.css({ position: 'relative', overflow: 'hidden', height: '100%' });
        this.config.$wrapper.append(this.$wrapper);
    }
    //左侧行号
    createLeftNumBg() {
        this.$leftNumBg = $('<div class="line_num_bg" style="float:left;position:relative;left:0;top:0;z-index:2;min-height:100%;padding:5px 0;padding-bottom:' + Editor.charHight + 'px;box-sizing:border-box"></div>');
        this.$wrapper.prepend(this.$leftNumBg);
        for (var i = 1; i <= this.maxVisualLine; i++) {
            var $num = $('<span class="line_num"></span>');
            $num.css({
                'display': 'block',
                'height': Editor.charHight + 'px',
                'line-height': Editor.charHight + 'px',
                'padding-right': '15px',
                'padding-left': '15px',
                'user-select': 'none',
                'text-align': 'right'
            })
            this.leftNumDom.push($num);
        }
    }
    //创建输入框
    creatTextarea() {
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
    createLineBg() {
        this.$lineBg = $('<div class="current_line_bg" style="display:none;position:absolute;top:5px;left:40px;right:0;z-index:1;height:' + Editor.charHight + 'px"></div>');
        this.$wrapper.append(this.$lineBg);
    }
    //创建光标
    createCrusor() {
        this.$cursor = $('<i class="cursor" style="display:none;position:absolute;top:0;width:2px;height:' + Editor.charHight + 'px;background-color:#333"></i>');
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
    createScrollBar() {
        this.$vScrollWrap = $('<div class="v_scrollbar_wrap" style="position:absolute;top:0;bottom:0;right:0;z-index:4;overflow:auto;width:22px;"><div class="v_scrollbar"></div></div>');
        this.$hScrollWrap = $('<div class="h_scrollbar_wrap" style="position:absolute;left:0;right:0;bottom:0;z-index:4;overflow:auto;height:22px;"><div class="h_scrollbar" style="height:100%"></div></div>');
        this.$vScrollBar = this.$vScrollWrap.find('.v_scrollbar');
        this.$hScrollBar = this.$hScrollWrap.find('.h_scrollbar');
        this.$wrapper.append(this.$vScrollWrap);
        this.$wrapper.append(this.$hScrollWrap);
    }
    /**
     * 将行列坐标转换成像素坐标（相对于scroller容器）
     * @param  {number} line   行号
     * @param  {number} column 列号
     * @return {Object}        top,left
     */
    posToPx(line, column) {
        var self = this;
        var top = (line - this.firstLine) * Editor.charHight + Util.pxToNum(Util.getStyleVal(this.$context[0], 'top'));
        var str = this.linesContext.getText(line).substring(0, column);
        var match = str.match(Util.fullAngleReg);
        var left = str.length * Editor.charWidth;
        var rect = Util.getRect(this.$scroller[0]);
        if (match) {
            left += match.length * (Editor.fullAngleCharWidth - Editor.charWidth);
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
     * @return {Object}        {line,column}
     */
    pxToPos(top, left, ifLine) {
        var column = this.cursorPos.column;
        var rect = Util.getRect(this.$scroller[0]);
        var line = top;
        left -= rect.paddingLeft;
        if (!ifLine) {
            top = top - rect.paddingTop - Util.pxToNum(Util.getStyleVal(this.$context[0], 'top'));
            line = Math.ceil(top / Editor.charHight);
            line = line + this.firstLine - 1;
        }
        line = line < 1 ? 1 : line;
        if (line > this.linesContext.getLength()) {
            line = this.linesContext.getLength();
            column = this.linesContext.getText(this.linesContext.getLength()).length;
        } else {
            var str = this.linesContext.getText(line);
            column = Math.ceil(left / Editor.charWidth);
            column = column < 0 ? 0 : column;
            column = column > str.length ? str.length : column;
            var match = str.match(Util.fullAngleReg);
            var maxWidth = str.length * Editor.charWidth;
            if (match) {
                maxWidth += match.length * (Editor.fullAngleCharWidth - Editor.charWidth);
            }
            if (left > maxWidth) {
                left = maxWidth;
            } else {
                while (column > 0) {
                    var str = this.linesContext.getText(line).substring(0, column);
                    var match = str.match(Util.fullAngleReg);
                    var _left = str.length * Editor.charWidth;
                    if (match) {
                        _left += match.length * (Editor.fullAngleCharWidth - Editor.charWidth);
                    }
                    if (Math.abs(_left - left) < Editor.charWidth) {
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
    /**
     * 更新光标行列坐标
     * @param {Object} pos {line,column}
     */
    setCursorPos(pos) {
        this.cursorPos.line = pos.line;
        this.cursorPos.column = pos.column;
    }
    //更新光标坐标
    updateCursorPos() {
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
        if (this.leftNumDom[this.cursorPos.line - this.firstLine]) {
            this.leftNumDom[this.cursorPos.line - this.firstLine].addClass('active');
        }
    }
    /**
     * 更新可视区域
     * @param  {boolean} ifScrollToCursor 是否滚动到光标位置
     */
    updateScroll(ifScrollToCursor) {
        var scroller = this.$scroller[0],
            context = this.$context[0],
            top = this.posToPx(this.cursorPos.line, 0).top,
            hasHBar = false,
            hasVBar = 0,
            realBarWidth = Util.getScrBarWidth();
        //设置编辑区宽度
        this.$context.css({
            'min-width': this.linesContext.getMaxWidth() + realBarWidth + 15 + 'px'
        })
        //横线滚动条会占用一定高度
        if (scroller.scrollWidth > scroller.clientWidth) {
            hasHBar = true;
        }
        if (this.linesContext.getLength() >= this.maxVisualLine - 1) {
            hasVBar = 22;
        }
        //设置横向滚动条左边距离
        this.$hScrollWrap.css({
            left: scroller.offsetLeft + 'px'
        })
        //设置纵向滚动条高度
        this.$vScrollBar.css({
            height: this.linesContext.getLength() * Editor.charHight + Util.pxToNum(Util.getStyleVal(scroller, 'paddingTop')) + 'px'
        })
        //设置横向滚动条宽度度
        this.$hScrollBar.css({
            width: context.scrollWidth - (hasVBar ? realBarWidth : 0) + 'px'
        })
        //出现横向滚动条后，纵向滚动条高度缩短22px
        if (Util.pxToNum(Util.getStyleVal(this.$vScrollWrap[0], 'bottom')) == 0 && hasHBar) {
            //获取真实滚动条宽度
            realBarWidth = this.$vScrollWrap[0].offsetWidth - this.$vScrollWrap[0].clientWidth;
            this.$vScrollWrap.css({
                bottom: realBarWidth + 'px'
            })
        } else if (!hasHBar) {
            this.$vScrollWrap.css({
                bottom: '0px'
            })
        }
        //出现纵向滚动条后，横向滚动条高度缩短22px
        if (Util.pxToNum(Util.getStyleVal(this.$hScrollWrap[0], 'right')) == 0 && hasVBar) {
            if (!realBarWidth) {
                realBarWidth = this.$hScrollWrap[0].offsetHeight - this.$hScrollWrap[0].clientHeight;
            }
            this.$hScrollWrap.css({
                right: realBarWidth + 'px'
            })
        } else if (!hasVBar) {
            this.$hScrollWrap.css({
                right: '0px'
            })
        }
        if (ifScrollToCursor) {
            var point = this.posToPx(this.cursorPos.line, this.cursorPos.column);
            var height = hasHBar ? this.$scroller[0].clientHeight - realBarWidth : this.$scroller[0].clientHeight;
            //处理纵向
            if (point.top < 0) {
                this.$vScrollWrap[0].scrollTop = (this.cursorPos.line - 1) * Editor.charHight;
            } else if (point.top > height - Editor.charHight) {
                var line = this.cursorPos.line - Math.ceil(height / Editor.charHight);
                this.$vScrollWrap[0].scrollTop = line * Editor.charHight + (Editor.charHight - height % Editor.charHight) + Util.pxToNum(Util.getStyleVal(scroller, 'paddingTop'));
            }
            //处理横向
            if (point.left < this.$hScrollWrap[0].scrollLeft + Editor.charWidth) {
                this.$hScrollWrap[0].scrollLeft = point.left - Editor.charWidth;
            } else if (point.left > this.$hScrollWrap[0].scrollLeft + this.$scroller[0].clientWidth - Editor.charWidth - realBarWidth) {
                this.$hScrollWrap[0].scrollLeft = point.left - this.$scroller[0].clientWidth + Editor.charWidth + realBarWidth;
            }
        }
    }
    /**
     * 在当前光标位置处插入内容
     * @param  {string} val 插入的内容
     */
    insertContent(newContent) {
        var str = this.linesContext.getText(this.cursorPos.line) || '',
            strs = null,
            firstLine;
        str = str.substring(0, this.cursorPos.column) + newContent + str.substr(this.cursorPos.column);
        strs = str.split(/\r\n|\r|\n/);
        if (strs[0]) { //'\n'.split(/\r\n|\r|\n/)->['','']
            this.linesContext.setText(this.cursorPos.line, strs[0]);
            if (strs.length > 1) {
                this.cursorPos.column = strs[strs.length - 1].length;
            } else {
                this.cursorPos.column = this.cursorPos.column + newContent.length;
            }
        } else {
            this.cursorPos.column = 0;
        }
        if (this.mode && this.cursorPos.line >= 1) {
            this.mode.onInsertBefore(this.cursorPos.line, this.cursorPos.line + strs.length - 1);
        }
        //粘贴操作可能存在换号符,需要添加新行
        for (var tmp = 1; tmp < strs.length; tmp++) {
            this.linesContext.add(this.cursorPos.line + tmp, strs[tmp]);
        }
        firstLine = this.firstLine;
        //计算可视区域的首行
        if (this.cursorPos.line - this.firstLine + strs.length > this.maxVisualLine) {
            firstLine = this.cursorPos.line + strs.length - this.maxVisualLine;
        }
        this.renderLine(firstLine);
        if (this.mode) {
            if (this.cursorPos.line < 1) { //初始化坐标为(0,0)
                this.mode.onInsertAfter(1, 1);
            } else {
                this.mode.onInsertAfter(this.cursorPos.line, this.cursorPos.line + strs.length - 1);
            }
        }
        this.cursorPos.line = this.cursorPos.line + strs.length - 1;
        this.updateScroll(true);
        this.updateCursorPos();
    }
    /**
     * 从编辑器中删除多行
     * @param  {object/number} startPos 开始行列坐标{line,column}/行号
     * @param  {Object} endPos   结束行列坐标{line,column}
     */
    deleteContent(startPos, endPos) {
        if (typeof startPos == 'number') {
            var line = startPos;
            if (line > 1) {
                startPos = { line: line - 1, column: this.linesContext.getText(line - 1).length };
            } else {
                startPos = { line: line, column: 0 };
            }
            endPos = { line: line, column: this.linesContext.getText(line).length };
        }
        this.mode && this.mode.onDeleteBefore(startPos.line, endPos.line);
        if (startPos.line == endPos.line) {
            var str = this.linesContext.getText(startPos.line);
            this.linesContext.setText(startPos.line, str.substring(0, startPos.column) + str.substring(endPos.column));
            this.cursorPos.column = startPos.column;
        } else {
            var str = this.linesContext.getText(startPos.line).substring(0, startPos.column) + this.linesContext.getText(endPos.line).substring(endPos.column);
            this.linesContext.setText(startPos.line, str);
            for (var i = this.firstLine; i < this.firstLine + this.maxVisualLine; i++) {
                if (i >= startPos.line && i <= endPos.line) {
                    this.linesContext.getDom(i).remove();
                }
            }
            //删除行
            this.linesContext.delete(startPos.line + 1, endPos.line);
            this.cursorPos.line = startPos.line;
            this.cursorPos.column = startPos.column;
        }
        this.renderLine();
        this.mode && this.mode.onDeleteAfter(startPos.line, endPos.line);
        this.updateScroll();
        this.updateCursorPos();
        this.$selectBg.html('');
        this.selection = {};
    }
    /**
     * 更新行号
     * @param  {number} firstLine 首行
     */
    updateNum(firstLine) {
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
     * 渲染选中背景
     * @param  {Object} startPos 开始行列坐标{line,column}
     * @param  {Object} endPos   结束行列坐标{line,column}
     */
    renderSelectBg(startPos, endPos) {
        var self = this,
            rect = Util.getRect(self.$scroller[0]);
        self.$selectBg.html('');
        self.selection.startPos = startPos;
        self.selection.endPos = endPos;
        if (startPos.line == endPos.line) {
            var str = self.linesContext.getText(startPos.line);
            var width = Util.getStrWidth(str, Editor.charWidth, Editor.fullAngleCharWidth, startPos.column, endPos.column);
            var px = self.posToPx(startPos.line, startPos.column);
            _renderRange(px.top, px.left, width);
            self.selection.selectText = str.substring(startPos.column, endPos.column);
            self.$lineBg.hide(); //隐藏当前行背景
        } else {
            var str = self.linesContext.getText(startPos.line);
            var maxWidth = self.$context[0].scrollWidth - 1; //防止$context真实宽度有小数（scrollWidth将被四舍五入）
            var width = Util.getStrWidth(str, Editor.charWidth, Editor.fullAngleCharWidth, 0, startPos.column);
            var px = self.posToPx(startPos.line, startPos.column);
            _renderRange(px.top, px.left, maxWidth - width);
            self.selection.selectText = str;
            for (var l = startPos.line + 1; l < endPos.line; l++) {
                self.selection.selectText += '\n' + self.linesContext.getText(l);
            }
            _renderBlock(startPos, endPos, rect.paddingLeft, maxWidth);
            str = self.linesContext.getText(endPos.line);
            width = Util.getStrWidth(str, Editor.charWidth, Editor.fullAngleCharWidth, 0, endPos.column);
            px = self.posToPx(endPos.line, 0);
            _renderRange(px.top, px.left, width);
            self.selection.selectText += '\n' + str.substring(0, endPos.column);
            self.$lineBg.hide(); //隐藏当前行背景
        }
        /**
         * 渲染中间的多行背景形成一个大的块
         * @param  {Object} startPos 开始行列坐标{line,column}
         * @param  {Object} endPos   结束行列坐标{line,column}
         * @param  {Number} left     到scroller容器的距离
         * @param  {Number} maxWidth 最大行的宽度
         */
        function _renderBlock(startPos, endPos, left, maxWidth) {
            var firstSelectLine = startPos.line + 1,
                lastSelectLine = endPos.line - 1,
                endLine = self.firstLine + self.maxVisualLine - 1;
            if (firstSelectLine > endLine || lastSelectLine < firstSelectLine) {
                return;
            }
            if (firstSelectLine < self.firstLine) {
                firstSelectLine = self.firstLine;
            }
            if (lastSelectLine > endLine) {
                lastSelectLine = endLine;
            }
            var height = (lastSelectLine - firstSelectLine + 1) * Editor.charHight;
            var top = self.posToPx(firstSelectLine, 0).top;
            _renderRange(top, left, maxWidth, height);
        }
        /**
         * 渲染一行背景
         * @param  {number} top   距离scroller容器顶部的距离
         * @param  {number} left  距离scroller容器左边的距离
         * @param  {number} width 背景的宽度
         */
        function _renderRange(top, left, width, height) {
            !height && (height = Editor.charHight)
            if (top > -Editor.charHight && top < self.$scroller[0].clientHeight) {
                self.$selectBg.append('<div class="selection_line_bg" style="position:absolute;top:' + top + 'px;left:' + left + 'px;width:' + width + 'px;height:' + height + 'px;background-color:rgb(181, 213, 255)"></div>');
            }
        }
    }
    /**
     * 渲染可视区域的行
     * @param  {number} firstLine 首行序号
     */
    renderLine(firstLine) {
        if (!firstLine) {
            firstLine = this.firstLine;
        }
        //设置优先处理行
        if (this.mode) {
            this.mode.setPriorLine(firstLine + this.maxVisualLine);
        }
        var self = this,
            allDom = this.$context.find('.pre_code_line');
        //删除可视区域之前的元素
        for (var i = this.firstLine; i > 0 && i < firstLine; i++) {
            allDom[i - this.firstLine] && allDom[i - this.firstLine].remove();
        }
        //遍历可视区域的元素是否需要挂载或更新
        for (var i = firstLine; i < firstLine + this.maxVisualLine && i <= this.linesContext.getLength(); i++) {
            var $dom = this.linesContext.getDom(i);
            var $preDom = this.linesContext.getDom(i - 1);
            //元素尚未挂载
            if (!$dom[0].isConnected) {
                if (i == firstLine) {
                    this.$context.prepend($dom);
                } else {
                    $dom.insertAfter($preDom);
                }
            }
            //元素有更新
            if (!$dom.hasUpdate) {
                this.linesContext.updateDom(i);
            }
        }
        allDom = this.$context.find('.pre_code_line');
        //可视区域元素个数大于最大可见个数，需要删除
        for (var i = allDom.length; i > this.maxVisualLine; i--) {
            allDom[i - 1].remove();
        }
        this.updateNum(firstLine);
        this.firstLine = firstLine;
    }
    //全选
    selectAll() {
        var startPos = { line: 1, column: 0 };
        var endPos = { line: this.linesContext.getLength(), column: this.linesContext.getText(this.linesContext.getLength()).length }
        this.renderSelectBg(startPos, endPos);
        this.setCursorPos(endPos);
    }
    //选中事件
    bindSelectEvent() {
        var self = this,
            startPx = null,
            originStartPos = null,
            originEndPos = null,
            autoDirect = '',
            timer = null,
            select = false;
        $(document).on('selectstart', function(e) {
            //阻止浏览器默认选中文字
            if (e.target != self.$textarea[0]) {
                e.preventDefault();
            }
        })
        this.$wrapper.on('mousedown', function(e) {
            if (e.target == self.$vScrollWrap[0] || e.target == self.$hScrollWrap[0]) {
                return;
            }
            var rect = Util.getRect(self.$scroller[0]);
            var scrollTop = self.$scroller[0].scrollTop;
            var scrollLeft = self.$scroller[0].scrollLeft;
            var top = e.clientY - rect.top + scrollTop;
            var left = e.clientX - rect.left + scrollLeft;
            startPx = { top: top, left: left };
            originStartPos = self.pxToPos(top, left);
            select = false;
            autoDirect = '';
            //去除选中区域
            if (e.button != 2) {
                self.selection.selectText = '';
                self.selection.startPos = null;
                self.selection.endPos = null;
                self.$selectBg.html('');
                select = true;
            }
            //输入框置底
            self.$textWrap.css({
                'z-index': -1
            });
        });
        this.$wrapper.on('mousemove', function(e) {
            e.stopPropagation();
            if (select) {
                var vBarWidth = self.linesContext.getLength() >= self.maxVisualLine ? Util.getScrBarWidth() : 0,
                    hBarHeight = self.$scroller[0].scrollWidth > self.$scroller[0].clientWidth ? Util.getScrBarWidth() : 0;
                Util.nextFrame(function() {
                    var rect = Util.getRect(self.$scroller[0]);
                    var scrollTop = self.$scroller[0].scrollTop;
                    var scrollLeft = self.$scroller[0].scrollLeft;
                    var top = e.clientY - rect.top + scrollTop;
                    var left = e.clientX - rect.left + scrollLeft;
                    var endPx = { top: top, left: left };
                    var startPos = { line: originStartPos.line, column: originStartPos.column };
                    var endPos = self.pxToPos(endPx.top, endPx.left);
                    originEndPos = endPos;
                    self.setCursorPos(endPos);
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
                    if (startPos.line < endPos.line || startPos.line == endPos.line && Math.abs(endPx.left - startPx.left) > Editor.charWidth) {
                        self.renderSelectBg(startPos, endPos);
                    }
                    if (top + hBarHeight + 5 > self.$scroller[0].clientHeight) {
                        autoDirect = 'down';
                        _move(2);
                    } else if (top - 5 < 0) {
                        autoDirect = 'up';
                        _move(2);
                    } else if (left - 5 < self.$scroller[0].scrollLeft) {
                        autoDirect = 'left';
                        _move(2);
                    } else if (left - self.$scroller[0].scrollLeft + vBarWidth + 5 > self.$scroller[0].clientWidth) {
                        autoDirect = 'right';
                        _move(2);
                    } else {
                        autoDirect = '';
                        Util.cancelNextFrame(timer);
                    }
                })
            }
        });
        //快速滚动
        $(document).on('mousemove', function(e) {
            if (select) {
                var rect = Util.getRect(self.$scroller[0]),
                    speed;
                Util.cancelNextFrame(timer);
                if (e.clientY - rect.top < 0) {
                    autoDirect = 'up';
                    speed = Math.abs(e.clientY - rect.top);
                    _move(speed);
                } else if (e.clientY - rect.top - self.$scroller[0].clientHeight > 0) {
                    autoDirect = 'down';
                    speed = e.clientY - rect.top - self.$scroller[0].clientHeight;
                    _move(speed);
                } else if (e.clientX - rect.left < 0) {
                    autoDirect = 'left';
                    speed = Math.abs(e.clientX - rect.left);
                    _move(speed);
                } else if (e.clientX - rect.left - self.$scroller[0].clientWidth > 0) {
                    autoDirect = 'right';
                    speed = e.clientX - rect.left - self.$scroller[0].clientWidth;
                    _move(speed);
                }
            }
        });
        //停止选择和滚动
        $(document).on('mouseup', function(e) {
            if (select) {
                self.$textarea.focus()
            }
            select = false;
            autoDirect = '';
            Util.cancelNextFrame(timer);
            self.updateCursorPos();
        });
        /**
         * 鼠标选择超出编辑区域时，自动滚动并选中
         * @param  {string} direct 滚动方向 up：向上滚动，down：两下滚动，left：向左，right：向右
         */
        function _move(speed) {
            var vScrollWrap = self.$vScrollWrap[0];
            var hScrollWrap = self.$hScrollWrap[0];
            var startPos = { line: originStartPos.line, column: originStartPos.column };
            var endPos = null;
            var vBarWidth = self.linesContext.getLength() >= self.maxVisualLine ? Util.getScrBarWidth() : 0,
                hBarHeight = self.$scroller[0].scrollWidth > self.$scroller[0].clientWidth ? Util.getScrBarWidth() : 0;
            if (autoDirect) {
                switch (autoDirect) {
                    case 'up':
                        if (vScrollWrap.scrollTop > 0) {
                            vScrollWrap.scrollTop -= speed;
                            endPos = self.pxToPos(0, 0);
                            endPos.column = originEndPos.column;
                        } else {
                            endPos = {};
                            endPos.line = 1;
                            endPos.column = 0;
                        }
                        break;
                    case 'down':
                        if (vScrollWrap.scrollTop < vScrollWrap.scrollHeight - vScrollWrap.clientHeight) {
                            vScrollWrap.scrollTop += speed;
                            endPos = self.pxToPos(self.$scroller[0].clientHeight - hBarHeight, 0);
                            endPos.column = originEndPos.column;
                        } else {
                            endPos = {};
                            endPos.line = self.linesContext.getLength();
                            endPos.column = self.linesContext.getText(endPos.line).length;
                        }
                        break;
                    case 'left':
                        if (hScrollWrap.scrollLeft > 0) {
                            hScrollWrap.scrollLeft -= speed;
                            endPos = self.pxToPos(originEndPos.line, self.$scroller[0].scrollLeft, true);
                        }
                        break;
                    case 'right':
                        if (hScrollWrap.scrollLeft < hScrollWrap.scrollWidth - hScrollWrap.clientWidth) {
                            hScrollWrap.scrollLeft += speed;
                            endPos = self.pxToPos(originEndPos.line, self.$scroller[0].clientWidth + self.$scroller[0].scrollLeft - vBarWidth, true);
                        }
                }
                if (endPos) {
                    _render(endPos);
                    timer = Util.nextFrame(function() {
                        _move(speed);
                    })
                }
            }

            function _render(endPos) {
                self.setCursorPos(endPos);
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
                self.renderSelectBg(startPos, endPos);
            }
        }
    }
    //menuContext事件
    bindMenuContextEvent() {
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
                    self.$textarea.val(' ');
                    self.$textarea[0].select();
                    console.log('select')
                }
                Util.nextFrame(function() {
                    self.selectAllText = Math.random();
                    self.$textarea.val(self.selectAllText); //触发全选
                });
            }
        });
    }
    //copy,cut,paste事件
    bindEditorEvent() {
        var self = this;
        var mime = window.clipboardData ? "Text" : "text/plain";
        this.$textarea.on('copy', function(e) {
            var clipboardData = e.originalEvent.clipboardData || window.clipboardData;
            self.copyText = self.selection.selectText;
            clipboardData.setData(mime, self.copyText);
            //返回false阻止默认复制，否则setData无效
            return false;
        })
        this.$textarea.on('paste', function(e) {
            var copyText = '',
                clipboardData = e.originalEvent.clipboardData || window.clipboardData;
            if (self.selection.startPos) {
                self.deleteContent(self.selection.startPos, self.selection.endPos);
            }
            if (e.originalEvent.clipboardData) {
                copyText = clipboardData.getData(mime);
            }
            if (!copyText) {
                copyText = self.copyText;
            } else {
                self.copyText = copyText;
            }
            if (copyText) {
                self.insertContent(self.copyText);
            }
            //如果不返回false，textarea会接受大量数据，网页会很卡
            return false;
        })
        this.$textarea.on('cut', function(e) {
            var clipboardData = e.originalEvent.clipboardData || window.clipboardData;
            self.copyText = self.selection.selectText;
            clipboardData.setData(mime, self.copyText);
            if (self.selection.startPos) {
                self.deleteContent(self.selection.startPos, self.selection.endPos);
            }
            //返回false阻止默认复制，否则setData无效
            return false;
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
    bindScrollEvent() {
        var self = this;
        $(window).on('resize', function(e) {
            self.updateScroll();
        })
        this.$wrapper.on('mousewheel', function(e) {
            self.$vScrollWrap[0].scrollTop += e.originalEvent.deltaY;
        })
        this.$vScrollWrap.on('scroll', function(e) {
            var firstLine = Math.floor(this.scrollTop / Editor.charHight) + 1;
            firstLine = firstLine < 1 ? 1 : firstLine;
            self.$context.css({
                top: -this.scrollTop % Editor.charHight + 'px'
            })
            self.$leftNumBg.css({
                top: -this.scrollTop % Editor.charHight + 'px'
            })
            self.renderLine(firstLine);
            //更新选中区域的背景
            self.selection.startPos && self.renderSelectBg(self.selection.startPos, self.selection.endPos);
            //更新光标
            self.updateCursorPos();
            //更新滚动条
            self.updateScroll();
        })
        this.$hScrollWrap.on('scroll', function() {
            self.$scroller[0].scrollLeft = this.scrollLeft;
        })
    }
    //输入事件
    bindInputEvent() {
        var self = this;
        var preCode = 0;
        this.$textarea.on('keydown', function(e) {
            self.$textarea.val('');
            if (e.ctrlKey && e.keyCode == 65) { //ctrl+a
                e.preventDefault();
                self.selectAll();
            } else if (e.ctrlKey && e.keyCode == 67) { //ctrl+c
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
                            self.cursorPos.column = self.linesContext.getText(self.cursorPos.line).length;
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
                        } else if (self.cursorPos.column < self.linesContext.getText(self.cursorPos.line).length) {
                            self.cursorPos.column++;
                        } else if (self.cursorPos.line < self.linesContext.getLength()) {
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
                        } else if (self.cursorPos.line < self.linesContext.getLength()) {
                            self.cursorPos.line++;
                            self.cursorPos.column = self.pxToPos(self.cursorPos.line, self.cursorPos.left, true).column;
                        }
                        break;
                    case 46: //delete
                        if (self.selection.startPos) {
                            self.deleteContent(self.selection.startPos, self.selection.endPos);
                        } else {
                            var startPos = { line: self.cursorPos.line, column: self.cursorPos.column };
                            var endPos = { line: self.cursorPos.line, column: self.cursorPos.column + 1 };
                            self.deleteContent(startPos, endPos);
                        }
                        break;
                    case 8: //backspace
                        if (self.selection.startPos) {
                            self.deleteContent(self.selection.startPos, self.selection.endPos);
                        } else {
                            if (self.cursorPos.column > 0) {
                                var startPos = { line: self.cursorPos.line, column: self.cursorPos.column - 1 };
                                var endPos = { line: self.cursorPos.line, column: self.cursorPos.column };
                                self.deleteContent(startPos, endPos);
                            } else if (self.cursorPos.line > 1) {
                                var startPos = { line: self.cursorPos.line - 1, column: self.linesContext.getText(self.cursorPos.line - 1) };
                                var endPos = { line: self.cursorPos.line, column: 0 };
                                self.deleteContent(self.cursorPos.line);
                            }
                        }
                        break;
                        // case 13: //换行
                        // case 108: //数字键换行
                        //     break;
                    case 9: //tab
                        e.preventDefault();
                        //选中区域全体移动
                        if (self.selection.startPos) {
                            var startPos = self.selection.startPos,
                                endPos = self.selection.endPos,
                                space = Util.space(self.config.tabsize);
                            for (var i = startPos.line; i <= endPos.line; i++) {
                                if (!e.shiftKey) { //想后移动
                                    self.linesContext.getDom(i).find('.code').prepend(space);
                                    self.linesContext.setText(i, space + self.linesContext.getText(i));
                                } else { //像前移动
                                    _shiftTab(i);
                                }
                            }
                            if (!e.shiftKey) {
                                startPos.column += 4;
                                endPos.column += 4;
                                self.renderSelectBg(startPos, endPos);
                            } else {
                                startPos.column = startPos.column - 4 >= 0 ? startPos.column - 4 : 0;
                                endPos.column = endPos.column - 4 >= 0 ? endPos.column - 4 : 0;
                                self.renderSelectBg(startPos, endPos);
                            }
                        } else {
                            if (!e.shiftKey) {
                                var val = Util.space(self.config.tabsize);
                                self.insertContent(val);
                            } else {
                                _shiftTab(self.cursorPos.line)
                            }
                        }
                        break;
                    default:
                        if (preCode > 222 && e.keyCode == 16) { //中文输入后shift延迟较大
                            setTimeout(function() {
                                _insertContent();
                            }, 150);
                        } else {
                            setTimeout(function() {
                                _insertContent();
                            }, 0)
                        }
                }
            }

            function _insertContent() {
                var val = self.$textarea.val();
                if (val) {
                    if (self.selection.startPos) {
                        self.deleteContent(self.selection.startPos, self.selection.endPos);
                    }
                    self.insertContent(val);
                }
            }

            function _shiftTab(line) {
                var hl = self.linesContext.getDom(line).find('.code').html();
                if (hl.indexOf('    ') == 0) {
                    self.linesContext.getDom(line).find('.code').html(hl.substr(4));
                    self.linesContext.setText(line, self.linesContext.getText(line).substr(4));
                    if (line == self.cursorPos.line) {
                        self.cursorPos.column -= 4;
                    }
                } else if (hl.indexOf('   ') == 0) {
                    self.linesContext.getDom(line).find('.code').html(hl.substr(3));
                    self.linesContext.setText(line, self.linesContext.getText(line).substr(3));
                    if (line == self.cursorPos.line) {
                        self.cursorPos.column -= 3;
                    }
                } else if (hl.indexOf('  ') == 0) {
                    self.linesContext.getDom(line).find('.code').html(hl.substr(2));
                    self.linesContext.setText(line, self.linesContext.getText(line).substr(2));
                    if (line == self.cursorPos.line) {
                        self.cursorPos.column -= 2;
                    }
                } else if (hl.indexOf(' ') == 0) {
                    self.linesContext.getDom(line).find('.code').html(hl.substr(1));
                    self.linesContext.setText(line, self.linesContext.getText(line).substr(1));
                    if (line == self.cursorPos.line) {
                        self.cursorPos.column -= 1;
                    }
                }
            }
            preCode = e.keyCode;
            self.updateCursorPos();
            self.updateScroll(true);
        })
    }
}

export default Editor;