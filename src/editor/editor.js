/*
 * @Author: lisong
 * @Date: 2020-10-31 13:48:50
 * @Description: 编辑器类
 */
import Util from '../common/util.js';
import LineContext from './line-context';
import History from './history';
import $ from 'jquery';
import css from '../css/editor.css';

class Editor {
    constructor(option) {
        this.charWH = {}; //字符长宽
        this.config = {}; //参数
        this.lineContext = new LineContext(this, option); //文本上下文
        this.history = new History(this);
        this.config.tabsize = option.tabsize || 4; //tab的宽度
        this.linePaddingRight = 0; //行内容的右边距
        this.domObj = {}; //dom
        this.scrollTop = 0; //纵向滚动距离
        this.startLine = 1; //开始渲染的行
        this.cursorPos = { //光标位置
            line: 1,
            column: 0
        };
        this.renderedLines = []; //已渲染的行号
        if (typeof option.$wrapper == 'string') {
            this.domObj.$wrapper = $(option.$wrapper);
        } else if (typeof option.$wrapper == 'object') {
            this.domObj.$wrapper = option.$wrapper;
        } else {
            return new Error('$wrapper must be string or object');
        }
        this._init();
        window.$ = $;
        window.editor = this;
    }
    _init() {
        this.creatContext();
        this.getCharWidth();
        this.createScrollBar();
        this.bindCursorEvent();
        this.bindInputEvent();
        this.bindScrollEvent();
        this.bindNumlEvent();
        this.setFocus(true);
        this.insertContent('');
    }
    //获取字符宽度
    getCharWidth() {
        var result = Util.getCharWidth(this.domObj.content[0]);
        this.charWH.charWidth = result.charWidth;
        this.charWH.charHight = result.charHight;
        this.charWH.fullAngleCharWidth = result.fullAngleCharWidth;
        this.linePaddingRight = this.charWH.fullAngleCharWidth;
        this.scrollBarWidth = Util.getScrBarWidth();
        this.domObj.cursor.css('height', this.charWH.charHight + 'px');
        this.domObj.textarea.css('height', this.charWH.charHight + 'px');
        this.domObj.contentScroller.css({
            'margin-right': this.scrollBarWidth + 'px'
        });
    }
    //创建容器
    creatContext() {
        var id = 'subjs-editor-' + Util.getUUID();
        var html =
            `
            <div class="subjs-editor-container" id=${id}>
                <div class="subjs-line-num-container"></div>
                <div class="subjs-content-container">
                    <textarea class="subjs-insert-textarea"></textarea>
                    <div class="subjs-content-scoller">
                        <div class="subjs-content">
                            <div class="subjs-insert-cursor"></div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        this.domObj.$wrapper.append(html);
        this.domObj.editor = $('#' + id);
        this.domObj.contentContainer = this.domObj.editor.find('.subjs-content-container');
        this.domObj.contentScroller = this.domObj.editor.find('.subjs-content-scoller');
        this.domObj.content = this.domObj.editor.find('.subjs-content');
        this.domObj.numContainer = this.domObj.editor.find('.subjs-line-num-container');
        this.domObj.cursor = this.domObj.editor.find('.subjs-insert-cursor');
        this.domObj.textarea = this.domObj.editor.find('.subjs-insert-textarea');
        this.domObj.content.top = 0;
        this.contentHeight = this.domObj.contentScroller.height();
        this.maxLine = Math.ceil(this.contentHeight / this.charWH.charHight) + 2;
    }
    //创建滚动条
    createScrollBar() {
        this.domObj.vScrollWrap = $(`<div class="subjs-v-scroll-wrap" style="width:${this.scrollBarWidth}px;bottom:${this.scrollBarWidth}px;"><div class="subjs-v-scroll"></div></div>`);
        this.domObj.hScrollWrap = $(`<div class="subjs-h-scroll-wrap" style="height:${this.scrollBarWidth}px;right:${this.scrollBarWidth}px;"><div class="subjs-h-scroll"></div></div>`);
        this.domObj.vScroll = this.domObj.vScrollWrap.find('.subjs-v-scroll');
        this.domObj.hScroll = this.domObj.hScrollWrap.find('.subjs-h-scroll');
        this.domObj.contentContainer.append(this.domObj.vScrollWrap);
        this.domObj.contentContainer.append(this.domObj.hScrollWrap);
        this.domObj.vScroll.realHeight = 0;
        this.domObj.vScroll.maxHeight = 32768;
        this.scrollWrapHeight = this.domObj.vScrollWrap.height();
    }
    //开始cursor闪烁
    startCursorTwinkle() {
        var self = this;
        this.domObj.cursor.visible = true;
        _startCursorTwinkle();

        function _startCursorTwinkle() {
            self.domObj.cursor.css({
                'visibility': self.domObj.cursor.visible ? 'visible' : 'hidden'
            });
            self.domObj.cursor.visible = !self.domObj.cursor.visible;
            clearTimeout(self.domObj.cursor.timer);
            self.domObj.cursor.timer = setTimeout(function () {
                _startCursorTwinkle();
            }, 500);
        }
    }
    //亭子光标闪烁
    stopCursorTwinkle() {
        this.domObj.cursor.css({
            'visibility': 'hidden'
        });
        clearTimeout(this.domObj.cursor.timer);
        this.domObj.cursor.visible = false;
    }
    /**
     * 设置光标位置
     * @param {Number} line 
     * @param {Number} column 
     */
    setCursorPos(line, column) {
        this.cursorPos.line = line;
        this.cursorPos.column = column;
    }
    /**
     * 插入内容
     * @param {String} text 待插入的内容
     * @param {Boolean} ifHistory 是否为历史记录操作
     */
    insertContent(text, ifHistory) {
        var opType = Util.constData.OP_ADD;
        if (this.selectedRange) {
            opType = Util.constData.OP_REPLACE;
            this.deleteContent();
        }
        var maxLength = this.lineContext.getLength();
        var cursorPos = this.lineContext.insertContent(text, this.cursorPos.line, this.cursorPos.column);
        var addedLength = cursorPos.line - this.cursorPos.line;
        var endLine = this.startLine + this.maxLine - 1;
        endLine = endLine > maxLength ? maxLength : endLine;
        for (var i = endLine; i >= this.cursorPos.line + 1; i--) { //更新dom对应的新行号
            var $line = this.domObj.contentScroller.find('.subjs-line-' + i);
            $line.removeClass(`subjs-line-${i}`).addClass(`subjs-line-${i + addedLength}`).attr('line', i + addedLength);
        }
        //记录插入操作
        !ifHistory && text && this.history.push(opType, Object.assign({}, this.cursorPos), Object.assign({}, cursorPos), text);
        this.setCursorPos(cursorPos.line, cursorPos.column);
        this.render();
    }
    /**
     * 删除内容
     * @param {Number} keyCode 删除键编码 {backspace, delete}
     * @param {Boolean} ifHistory 是否为历史记录操作
     */
    deleteContent(keyCode, ifHistory) {
        var start = null;
        var end = null;
        var text = '';
        if (this.selectedRange) {
            start = this.selectedRange.start;
            end = this.selectedRange.end;
            if (Util.comparePos(start, end) > 0) {
                var temp = start;
                start = end;
                end = temp;
            }
            end.line > start.line && _fixLine.bind(this)(start.line, end.line - start.line);
            text = this.lineContext.getRangeText(start, end);
            if (start.line != end.line || start.column != end.column) {
                //记录删除操作
                !ifHistory && this.history.push(Util.constData.OP_DEL, Object.assign({}, start), Object.assign({}, end), text);
            }
            this.lineContext.deleteContent(start, end);
            this.selectedRange = null;
            this.setCursorPos(start.line, start.column);
            this.render();
        } else if (keyCode == Util.keyCode.backspace) {
            end = this.cursorPos;
            if (end.line > 1 || end.column > 0) {
                if (end.column > 0) {
                    start = {
                        line: end.line,
                        column: end.column - 1
                    };
                } else {
                    start = {
                        line: end.line - 1,
                        column: this.lineContext.getText(end.line - 1).length
                    };
                    _fixLine.bind(this)(start.line, 1);
                }
                text = this.lineContext.getRangeText(start, end);
                if (start.line != end.line || start.column != end.column) {
                    //记录删除操作
                    !ifHistory && this.history.push(Util.constData.OP_DEL, Object.assign({}, start), Object.assign({}, end), text);
                }
                this.lineContext.deleteContent(start, end);
                this.setCursorPos(start.line, start.column);
                this.render();
            }
        } else if (keyCode == Util.keyCode.delete) {
            start = this.cursorPos;
            var text = this.lineContext.getText(start.line);
            var maxLength = this.lineContext.getLength();
            if (start.line < maxLength || start.column < text.length) {
                if (start.column < text.length) {
                    end = {
                        line: start.line,
                        column: start.column + 1
                    };
                } else {
                    end = {
                        line: start.line + 1,
                        column: 0
                    };
                    _fixLine.bind(this)(start.line, 1);
                }
                text = this.lineContext.getRangeText(start, end);
                if (start.line != end.line || start.column != end.column) {
                    //记录删除操作
                    !ifHistory && this.history.push(Util.constData.OP_DEL, Object.assign({}, start), Object.assign({}, end), text);
                }
                this.lineContext.deleteContent(start, end);
                this.setCursorPos(start.line, start.column);
                this.render();
            }
        }
        /**
         * 修复行号
         * @param {Number} startLine 
         * @param {Number} deletedLength 
         */
        function _fixLine(startLine, deletedLength) {
            if (deletedLength < 1) {
                return;
            }
            this.domObj.content.find('.subjs-line').each((i, item) => {
                var $item = $(item);
                var line = $item.attr('line') - 0;
                if (line > startLine + deletedLength) {
                    $item.removeClass(`subjs-line-${line}`).addClass(`subjs-line-${line - deletedLength}`).attr('line', line - deletedLength);
                } else if (line > startLine) {
                    this.domObj.content.find(`.subjs-line-${line}`).remove();
                }
            });
        }
    }
    /**
     * 渲染
     * @param {Boolean} ifScroll 是否为滚动导致渲染
     * @param {Boolean} ifFold 是否为折叠导致渲染
     */
    render(ifScroll, ifFold) {
        var maxLength = this.lineContext.getLength();
        var preStartLine = this.startLine;
        if (!ifScroll && !ifFold) { //非滚动渲染
            var maxWidthObj = this.lineContext.getMaxWidth();
            //避免重复计算
            if (!(this.render.maxWidthObj && this.lineContext.getText(maxWidthObj.line) == this.render.maxWidthObj.text)) {
                var text = this.lineContext.getText(maxWidthObj.line);
                this.render.maxWidthObj = maxWidthObj;
                this.render.maxWidthObj.text = text;
                this.render.maxWidth = this.getStrExactWidth(text, this.domObj.contentScroller[0]);
                this.domObj.contentScroller.css({
                    'padding-bottom': this.render.maxWidth - this.domObj.contentScroller.width() >= 1 ? this.scrollBarWidth + 'px' : '0'
                });
                this.contentHeight = this.domObj.contentScroller.height();
            }
            var cursorLine = this.getCountLines(1, this.cursorPos.line);
            var deltaLines = this.getCountLines(this.startLine, this.cursorPos.line);
            var y = this.charWH.charHight * deltaLines;
            if (this.scrollTop + this.contentHeight > maxLength * this.charWH.charHight) { //删除了底部内容
                this.scrollTop = this.getRealLine(maxLength) * this.charWH.charHight - this.contentHeight;
            } else if (y - this.domObj.content.top > this.contentHeight - this.charWH.charHight) { //光标将超出底部可视区域
                this.scrollTop = cursorLine * this.charWH.charHight - this.contentHeight;
            } else if (this.cursorPos.line <= this.startLine) { //光标将超出顶部可视区域
                this.scrollTop = (cursorLine - 1) * this.charWH.charHight;
            }
        }
        this.scrollTop = this.scrollTop > 0 ? this.scrollTop : 0;
        this.startLine = Math.floor(this.scrollTop / this.charWH.charHight);
        this.startLine++;
        this.startLine = this.getRealLine(this.startLine);
        this.domObj.content.top = this.scrollTop % this.charWH.charHight;
        this.domObj.content.css({
            'top': -this.domObj.content.top + 'px',
            'min-width': this.render.maxWidth + this.linePaddingRight + 'px'
        });
        this.domObj.numContainer.css({
            'top': -this.domObj.content.top + 'px'
        });
        //滚动渲染未改变行首位置，直接完成
        if (ifScroll && !ifFold && this.startLine == preStartLine) {
            return;
        }
        this.maxLine = Math.ceil(this.contentHeight / this.charWH.charHight) + 2;
        _renderLine.bind(this)();
        this.renderNum();
        this.renderCursor(ifScroll);
        this.renderSelectedBg();
        this.renderScrollerBar();
        this.render.timer = null;
        /**
         * 渲染行内容
         */
        function _renderLine() {
            var maxLength = this.lineContext.getLength();
            var lines = []; //已存在的有效行号
            var $lineDoms = []; //已存在的有效dom
            var fragment = null;
            var $lines = this.domObj.content.find('.subjs-line');
            var foldLineObjs = [];
            var startLine = this.startLine;
            for (var i = 1; i <= this.maxLine && startLine <= maxLength; i++) {
                var lineObj = this.lineContext.getLine(startLine);
                if (lineObj.foldTag == Util.constData.FOLD_CLOSE) {
                    foldLineObjs.push(lineObj);
                    startLine = lineObj.foldTagToken.matchedNode.line;
                } else {
                    startLine++;
                }
            }
            $lines.each((i, item) => { //删除无用dom
                var $item = $(item);
                var line = $item.attr('line') - 0;
                if (line > startLine || line > maxLength || line < this.startLine || this.checkInFold(foldLineObjs, line)) {
                    $item.remove();
                    this.lineContext.setRenderTag(line, false);
                } else {
                    lines.push(line);
                    $lineDoms.push($item);
                }
            });
            //更新或插入
            startLine = this.startLine;
            this.renderedLines = [];
            for (var i = 1; i <= this.maxLine && startLine <= maxLength; i++) {
                var lineObj = this.lineContext.getLine(startLine);
                var $line = null;
                this.renderedLines.push(startLine);
                if (!lineObj.rendered) {
                    var html = this.lineContext.getHTML(startLine);
                    if (lines.indexOf(startLine) > -1) {
                        $line = $lineDoms[lines.indexOf(startLine)];
                        $line.find('.subjs-code').html(html);
                        if (fragment) {
                            $(fragment).insertBefore($line);
                            fragment = null;
                        }
                    } else {
                        fragment = fragment || document.createDocumentFragment();
                        fragment.append($(`<div class="subjs-line subjs-line-${startLine}" line="${startLine}" style="height:${this.charWH.charHight}px;padding-right:${this.linePaddingRight}px"><div class="subjs-code">${html}</div></div>`)[0]);
                    }
                    this.lineContext.setRenderTag(startLine, true);
                } else if (fragment) {
                    $line = $lineDoms[lines.indexOf(startLine)];
                    $(fragment).insertBefore($line);
                    fragment = null;
                }
                if (lineObj.foldTag == Util.constData.FOLD_CLOSE) {
                    startLine = lineObj.foldTagToken.matchedNode.line;
                } else {
                    startLine++;
                }
            }
            if (fragment) {
                this.domObj.content.append(fragment);
            }
        }
    }
    /**
     * 渲染行号
     */
    renderNum() {
        var maxLength = this.lineContext.getLength();
        var lines = [];
        var $numDoms = [];
        var fragment = null;
        var $nums = this.domObj.numContainer.find('.subjs-line-num');
        var foldLineObjs = [];
        var startLine = this.startLine;
        for (var i = 1; i <= this.maxLine && startLine <= maxLength; i++) {
            var lineObj = this.lineContext.getLine(startLine);
            if (lineObj.foldTag == Util.constData.FOLD_CLOSE) {
                foldLineObjs.push(lineObj);
                startLine = lineObj.foldTagToken.matchedNode.line;
            } else {
                startLine++;
            }
        }
        $nums.each((i, item) => { //删除无用dom
            var $item = $(item);
            var line = $item.attr('line') - 0;
            if (line > startLine || line > maxLength || line < this.startLine || this.checkInFold(foldLineObjs, line)) {
                $item.remove();
            } else {
                lines.push(line);
                $numDoms.push($item);
            }
        });
        startLine = this.startLine;
        for (var i = 0; i < this.maxLine && startLine <= maxLength; i++) {
            var lineObj = this.lineContext.getLine(startLine);
            var index = lines.indexOf(startLine);
            var foldTag = lineObj.foldTag == Util.constData.FOLD_OPEN ? 'fold-arrow-open' : (lineObj.foldTag == Util.constData.FOLD_CLOSE ? 'fold-arrow-close' : '');
            if (index > -1) {
                var $num = $numDoms[index];
                $num.removeClass('fold-arrow-open').removeClass('fold-arrow-close').addClass(foldTag);
                if (fragment) {
                    $(fragment).insertBefore($num);
                    fragment = null;
                }
            } else {
                fragment = fragment || document.createDocumentFragment();
                fragment.append($(`<div class="subjs-line-num ${foldTag}" line="${startLine}" style="height:${this.charWH.charHight}px;"><span class="icon-tip"></span><span class="tip-text"></span><span class="icon-fold"></span>${startLine}</div>`)[0]);
            }
            if (lineObj.foldTag == Util.constData.FOLD_CLOSE) {
                startLine = lineObj.foldTagToken.matchedNode.line;
            } else {
                startLine++;
            }
        }
        if (fragment) {
            this.domObj.numContainer.append(fragment);
        }
    }
    /**
     * 检测行号是否被折叠
     * @param {Array} foldLineObjs 
     * @param {Number} line 
     */
    checkInFold(foldLineObjs, line) {
        for (var i = 0; i < foldLineObjs.length; i++) {
            if (line > foldLineObjs[i].foldTagToken.line && line < foldLineObjs[i].foldTagToken.matchedNode.line) {
                return true
            }
        }
        return false;
    }
    /**
     * 渲染光标
     * @param {Boolean} ifScroll 是否为滚动导致的渲染
     */
    renderCursor(ifScroll) {
        var str = this.lineContext.getText(this.cursorPos.line, 0, this.cursorPos.column);
        var strWidth = this.getStrExactWidth(str, this.domObj.contentScroller[0]);
        var y = this.charWH.charHight * (this.getCountLines(this.startLine, this.cursorPos.line) - 1);
        var x = strWidth >= 1 ? strWidth - 1 : strWidth;
        this.stopCursorTwinkle();
        this.domObj.cursor.css({
            'left': x + 'px',
            'top': y + 'px'
        });
        this.domObj.cursor.top = y;
        this.domObj.cursor.left = x;
        this.startCursorTwinkle();
        this.domObj.numContainer.find('.subjs-line-num.active').removeClass('active');
        this.domObj.numContainer.find(`.subjs-line-num[line="${this.cursorPos.line}"]`).addClass('active');
        this.domObj.content.find('.subjs-line.active').removeClass('active');
        this.domObj.content.find(`.subjs-line-${this.cursorPos.line}`).addClass('active');
        if (!ifScroll) { //非滚动渲染，需要确保光标在可视区域内
            var str = this.lineContext.getText(this.cursorPos.line, 0, this.cursorPos.column);
            var left = strWidth;
            var scrollLeft = this.domObj.contentScroller[0].scrollLeft;
            var width = this.domObj.contentScroller.width();
            if (left - scrollLeft > width) { //光标将超出右边可视区域
                this.domObj.contentScroller[0].scrollLeft = left - width + this.charWH.charWidth;
            } else if (left < scrollLeft) { //光标将超出左边边可视区域
                this.domObj.contentScroller[0].scrollLeft = left - this.charWH.fullAngleCharWidth;
            }
        }
        this.renderTextarea();
    }
    /**
     * 设置textarea位置
     */
    renderTextarea() {
        var top = this.domObj.cursor.top;
        var left = this.domObj.cursor.left;
        var scrollLeft = this.domObj.contentScroller[0].scrollLeft;
        var scrollTop = this.domObj.contentScroller[0].scrollTop;
        var width = this.domObj.contentScroller.outerWidth();
        var height = this.domObj.contentScroller.outerHeight();
        left = left - scrollLeft;
        top = top - scrollTop - this.domObj.content.top;
        //输入框如果在可视区域之外，改变其绝对位置时会导致滚动条滚动
        if (left > width) {
            left = width - this.charWH.fullAngleCharWidth;
        } else if (left < 0) {
            left = this.charWH.fullAngleCharWidth;
        } else if (top > height - this.charWH.charHight) {
            top = height - this.charWH.charHight;
        } else if (top < 0) {
            top = this.charWH.charHight;
        }
        this.domObj.textarea.css({
            left: left + 'px',
            top: top + 'px'
        });
    }
    /**
     * 渲染选中区域的背景
     */
    renderSelectedBg() {
        this.domObj.contentContainer.find('.subjs-line-bg').remove();
        if (this.selectedRange && (this.selectedRange.start.line != this.selectedRange.end.line || this.selectedRange.start.column != this.selectedRange.end.column)) {
            var start = this.selectedRange.start;
            var end = this.selectedRange.end;
            var left = this.getStrExactWidth(this.lineContext.getText(start.line, 0, start.column), this.domObj.contentScroller[0]);
            var right = this.getStrExactWidth(this.lineContext.getText(end.line, 0, end.column), this.domObj.contentScroller[0]);
            if (Util.comparePos(start, end) > 0) {
                var temp = start;
                start = end;
                end = temp;
                temp = left;
                left = right;
                right = temp;
            }
            if (start.line != end.line) {
                var endLine = this.getDeltaLine(this.startLine, this.maxLine);
                for (var i = this.startLine; i <= endLine; i++) {
                    if (i > start.line && i < end.line) {
                        this.domObj.content.find('.subjs-line-' + i).append(`<div class="subjs-line-bg subjs-line-bg-${i}" style="left:0;right:0"></div>`);
                    }
                }
                this.domObj.content.find('.subjs-line-' + start.line).append(`<div class="subjs-line-bg subjs-line-bg-${start.line}" style="left:${left}px;right:0"></div>`);
                this.domObj.content.find('.subjs-line-' + end.line).append(`<div class="subjs-line-bg subjs-line-bg-${end.line}" style="left:0;width:${right}px"></div>`);
            } else {
                this.domObj.content.find('.subjs-line-' + start.line).append(`<div class="subjs-line-bg subjs-line-bg-${start.line}" style="left:${left}px;width:${right - left}px"></div>`);
            }
        }
    }
    /**
     * 更新滚动条
     */
    renderScrollerBar() {
        var deffWidth = this.domObj.contentScroller.width() - this.domObj.hScrollWrap.width();
        var deffHeight = this.domObj.contentScroller.height() - this.domObj.vScrollWrap.height();
        var realWidth = this.domObj.contentScroller[0].scrollWidth - deffWidth;
        var realHeight = this.lineContext.getLength() * this.charWH.charHight - deffHeight;
        var showHbar = realWidth - this.domObj.hScrollWrap.width() >= 1;
        //当设置div的高度过大时，渲染会失真，实际高度可能低于该值，故设置一个最大值，使用比例去计算实际滚动距离
        this.domObj.vScroll.realHeight = realHeight > this.domObj.vScroll.maxHeight ? this.domObj.vScroll.maxHeight : realHeight;
        this.domObj.hScroll.css({
            width: realWidth + 'px'
        });
        this.domObj.vScroll.css({
            height: this.domObj.vScroll.realHeight + 'px'
        });
        this.domObj.hScrollWrap.css({
            'z-index': showHbar ? 1 : -1
        });
        this.domObj.vScrollWrap[0].scrollTop = this.getScrollTop(this.scrollTop, true);
    }
    /**
     * 设置光标聚焦
     * @param {Boolean} ifFocus 
     */
    setFocus(ifFocus) {
        this.domObj.textarea.trigger(ifFocus ? 'focus' : 'blur');
    }
    /**
     * 设置选中区域
     * @param {Object} startPos {line, column}
     * @param {Object} endPos {line, column} 
     */
    setRange(startPos, endPos) {
        this.selectedRange = {
            start: startPos,
            end: endPos
        }
    }
    /**
     * 清除选择区域
     */
    clearRnage() {
        this.selectedRange = null;
        this.renderSelectedBg();
    }
    /**
     * 设置纵向滚动距离
     * @param {Number} scrollTop [真实渲染距离] 
     */
    setScrollTop(scrollTop) {
        var _scrollTop = this.getScrollTop(scrollTop, true);
        this.domObj.vScrollWrap[0].scrollTop = _scrollTop;
        if (_scrollTop - this.domObj.vScrollWrap[0].scrollTop < 1) {
            this.domObj.vScrollWrap[0].realScrollTop = scrollTop;
        }
    }
    /**
     * 获取文字的宽度
     * @param {Char} ch 
     */
    getCharWdith(ch) {
        var charWidth = 0;
        if (ch) {
            if (ch.match(Util.fullAngleReg)) {
                charWidth = this.charWH.fullAngleCharWidth;
            } else {
                charWidth = this.charWH.charWidth;
            }
        }
        return charWidth;
    }
    /**
     * 根据偏移量获取一行文本中的列号
     * @param {String} text 
     * @param {Number} offsetX 
     */
    getColumnByWidth(text, offsetX) {
        var column = 0;
        var width = 0;
        while (width < offsetX && column < text.length) { //粗略判断出位置
            width += this.getCharWdith(text[column]);
            column++;
        }
        // var realWidth = this.getStrExactWidth(text.slice(0, column), this.domObj.contentContainer[0]);
        // while (realWidth + this.getCharWdith(text[column]) / 2 < offsetX && column < text.length) {
        //     column++;
        //     realWidth = this.getStrExactWidth(text.slice(0, column), this.domObj.contentContainer[0]);
        // }
        // while (realWidth - this.getCharWdith(text[column - 1]) / 2 > offsetX && column > 0) {
        //     column--;
        //     realWidth = this.getStrExactWidth(text.slice(0, column), this.domObj.contentContainer[0]);
        // }
        return column;
    }
    /**
     * 获取鼠标事件在编辑区域的位置
     * @param {Event} e 
     * @return {Object} {line,column}
     */
    getEventPos(e) {
        var offset = this.domObj.content.offset();
        var line = this.getDeltaLine(this.startLine, Math.ceil((e.clientY - offset.top) / this.charWH.charHight) - 1);
        var column = 0;
        var text = '';
        var maxLength = this.lineContext.getLength();
        if (line <= maxLength) {
            text = this.lineContext.getText(line);
            column = this.getColumnByWidth(text, e.clientX - offset.left);
        } else {
            line = maxLength;
            column = this.lineContext.getText(line).length;
        }
        return {
            line: line,
            column: column
        }
    }
    getStrExactWidth(str) {
        return Util.getStrWidth(str, this.charWH.charWidth, this.charWH.fullAngleCharWidth);
    }
    /**
     * 获取增加delta后的行号
     * @param {Number} startLine 
     * @param {Number} endLine 
     */
    getDeltaLine(startLine, delta) {
        for (var i = 0; i < delta; i++) {
            startLine++;
            var lineObj = this.lineContext.getLine(startLine - 1);
            if (lineObj && lineObj.foldTag == Util.constData.FOLD_CLOSE) {
                startLine = lineObj.foldTagToken.matchedNode.line;
            }
        }
        return startLine;
    }
    /**
     * 获取两行包含的真实行数
     * @param {Number} startLine 
     * @param {Number} endLine 
     */
    getCountLines(startLine, endLine) {
        var count = endLine - startLine + 1;
        for (var i = startLine; i < endLine; i++) {
            var lineObj = this.lineContext.getLine(i);
            if (lineObj.foldTag == Util.constData.FOLD_CLOSE) {
                count -= lineObj.foldTagToken.matchedNode.line - lineObj.foldTagToken.line - 1;
            }
        }
        return count;
    }
    /**
     * 获取包含折叠行的真实行数
     * @param {Number} endLine 
     */
    getRealLine(endLine) {
        var count = 0;
        for (var i = 1; i <= endLine; i++) {
            var lineObj = this.lineContext.getLine(i - 1);
            if (lineObj && lineObj.foldTag == Util.constData.FOLD_CLOSE) {
                count = lineObj.foldTagToken.matchedNode.line;
            } else {
                count++;
            }
        }
        return count;
    }
    /**
     * 获取scrollTop
     * @param {Number} scrollTop 
     * @param {Boolean}  shrink [true:获取收缩比例后的scrollTop,false:获取放大比例后的scrollTop]
     */
    getScrollTop(scrollTop, shrink) {
        var contentHeight = this.contentHeight;
        var scrollWrapHeight = this.scrollWrapHeight;
        var height = this.lineContext.getLength() * this.charWH.charHight;
        var barHeight = this.domObj.vScroll.realHeight;
        if (barHeight < this.domObj.vScroll.maxHeight) {
            return scrollTop;
        }
        if (shrink) {
            scrollTop = scrollTop * (barHeight - scrollWrapHeight) / (height - contentHeight);
        } else {
            scrollTop = scrollTop * (height - contentHeight) / (barHeight - scrollWrapHeight);
        }
        return scrollTop;
    }
    //鼠标事件
    bindCursorEvent() {
        var self = this;
        var startPos = {};
        var endPos = {};
        var offset = null;
        var scrollerHeight = 0;
        var scrollerWidth = 0;
        $(document).on('selectstart', function (e) {
            //阻止浏览器默认选中文字
            e.preventDefault();
        })
        //编辑区域鼠标按下事件
        this.domObj.contentScroller.on('mousedown', (e) => {
            offset = this.domObj.contentScroller.offset();
            scrollerHeight = this.domObj.contentScroller.outerHeight();
            scrollerWidth = this.domObj.contentScroller.outerWidth();
            if (e.button == 2) { //右键

            } else {
                startPos = this.getEventPos(e);
                this.selectedRange = null;
                this.renderSelectedBg();
                this.setCursorPos(startPos.line, startPos.column);
                this.renderCursor();
                this.setFocus(true);
                this.domObj.contentScroller.startSelect = true;
                this.domObj.contentScroller.now = new Date().getTime();
            }
        });
        //鼠标移动事件
        $(document).on('mousemove', (e) => {
            if (e.button == 2) { //右键

            } else {
                if (this.domObj.contentScroller.startSelect && new Date().getTime() - this.domObj.contentScroller.now > 100) {
                    endPos = this.getEventPos(e);
                    this.setCursorPos(endPos.line, endPos.column);
                    this.renderCursor();
                    if (endPos.line != startPos.line || endPos.column != startPos.column) {
                        this.selectedRange = {
                            start: startPos,
                            end: endPos
                        }
                        this.renderSelectedBg();
                    }
                    if (e.clientY > offset.top + scrollerHeight) { //鼠标超出底部区域
                        _move('down', e.clientY - offset.top - scrollerHeight);
                    } else if (e.clientY < offset.top) { //鼠标超出顶部区域
                        _move('up', offset.top - e.clientY);
                    } else if (e.clientX < offset.left) { //鼠标超出左边区域
                        _move('left', offset.left - e.clientX);
                    } else if (e.clientX > offset.left + scrollerWidth) { //鼠标超出右边区域
                        _move('right', e.clientX - offset.left - scrollerWidth);
                    }
                }
            }
        });
        //鼠标弹起事件
        $(document).on('mouseup', (e) => {
            this.domObj.contentScroller.startSelect = false;
            this.setFocus(true);
            Util.cancelNextFrame(_move.timer);
        });
        /**
         * 鼠标选择超出编辑区域时，自动滚动并选中
         * @param  {String} autoDirect 滚动方向 up：向上滚动，down：两下滚动，left：向左，right：向右
         * @param  {Number} speed 速度
         */
        function _move(autoDirect, speed) {
            Util.cancelNextFrame(_move.timer);
            _run(autoDirect, speed);

            function _run(autoDirect, speed) {
                switch (autoDirect) {
                    case 'up':
                        var scrollTop = self.scrollTop - speed;
                        scrollTop = scrollTop > 0 ? scrollTop : 0;
                        //使第一行对齐顶部
                        scrollTop = Math.floor(scrollTop / self.charWH.charHight) * self.charWH.charHight;
                        var line = Math.floor(scrollTop / self.charWH.charHight) + 1;
                        line = self.getRealLine(line);
                        self.selectedRange = {
                            start: startPos,
                            end: {
                                line: line,
                                column: 0
                            }
                        }
                        self.setCursorPos(line, 0);
                        self.setScrollTop(scrollTop);
                        break;
                    case 'down':
                        var scrollTop = self.scrollTop + speed;
                        //使最后一行对齐底部
                        scrollTop = Math.floor((scrollTop + scrollerHeight) / self.charWH.charHight) * self.charWH.charHight - scrollerHeight;
                        var line = Math.floor((scrollTop + scrollerHeight) / self.charWH.charHight);
                        var maxLength = self.lineContext.getLength();
                        line = self.getRealLine(line);
                        if (line > maxLength) {
                            line = maxLength;
                        }
                        var text = self.lineContext.getText(line);
                        self.selectedRange = {
                            start: startPos,
                            end: {
                                line: line,
                                column: text.length
                            }
                        }
                        self.setCursorPos(line, text.length);
                        self.setScrollTop(scrollTop);
                        break;
                    case 'left':
                        self.domObj.hScrollWrap[0].scrollLeft -= speed;
                        var text = self.lineContext.getText(self.cursorPos.line);
                        var column = self.getColumnByWidth(text, self.domObj.hScrollWrap[0].scrollLeft);
                        self.selectedRange = {
                            start: startPos,
                            end: {
                                line: self.cursorPos.line,
                                column: column
                            }
                        }
                        self.setCursorPos(self.cursorPos.line, column);
                        self.renderCursor();
                        break;
                    case 'right':
                        self.domObj.hScrollWrap[0].scrollLeft += speed;
                        var text = self.lineContext.getText(self.cursorPos.line);
                        var column = self.getColumnByWidth(text, self.domObj.hScrollWrap[0].scrollLeft + scrollerWidth);
                        self.selectedRange = {
                            start: startPos,
                            end: {
                                line: self.cursorPos.line,
                                column: column
                            }
                        }
                        self.setCursorPos(self.cursorPos.line, column);
                        self.renderCursor();
                        break;
                }
                _move.timer = Util.nextFrame(() => {
                    _run(autoDirect, speed)
                });
            }
        }
    }
    bindInputEvent() {
        this.domObj.textarea.on('keydown', (e) => {
            if (e.ctrlKey && e.keyCode == 65) { //ctrl+a,全选
                e.preventDefault();
                var maxLength = this.lineContext.getLength();
                this.selectedRange = {
                    start: {
                        line: 1,
                        column: 0
                    },
                    end: {
                        line: maxLength,
                        column: this.lineContext.getText(maxLength).length
                    }
                }
                this.renderSelectedBg();
            } else if (e.ctrlKey && (e.keyCode == 90 || e.keyCode == 122)) { //ctrl+z，撤销
                e.preventDefault();
                this.history.undo();
                this.clearRnage();
            } else if (e.ctrlKey && (e.keyCode == 89 || e.keyCode == 121)) { //ctrl+y，重做
                e.preventDefault();
                this.history.redo();
                this.clearRnage();
            } else {
                switch (e.keyCode) {
                    case 37: //left arrow
                        if (this.cursorPos.column > 0) {
                            this.setCursorPos(this.cursorPos.line, this.cursorPos.column - 1);
                            this.renderCursor();
                        } else if (this.cursorPos.line > 1) {
                            this.setCursorPos(this.cursorPos.line - 1, this.lineContext.getText(this.cursorPos.line - 1).length);
                            this.renderCursor();
                        }
                        this.clearRnage();
                        break;
                    case 38: //up arrow
                        if (this.cursorPos.line > 1) {
                            var text = this.lineContext.getText(this.cursorPos.line);
                            var width = this.getStrExactWidth(text.slice(0, this.cursorPos.column), this.domObj.contentScroller[0]);
                            text = this.lineContext.getText(this.cursorPos.line - 1);
                            var column = this.getColumnByWidth(text, width);
                            this.setCursorPos(this.cursorPos.line - 1, column);
                            this.render();
                        }
                        this.clearRnage();
                        break;
                    case 39: //right arrow
                        var text = this.lineContext.getText(this.cursorPos.line);
                        var maxLength = this.lineContext.getLength();
                        if (this.cursorPos.column < text.length) {
                            this.setCursorPos(this.cursorPos.line, this.cursorPos.column + 1);
                            this.renderCursor();
                        } else if (this.cursorPos.line < maxLength) {
                            this.setCursorPos(this.cursorPos.line + 1, 0);
                            this.renderCursor();
                        }
                        this.clearRnage();
                        break;
                    case 40: //down arrow
                        var maxLength = this.lineContext.getLength();
                        if (this.cursorPos.line < maxLength) {
                            var text = this.lineContext.getText(this.cursorPos.line);
                            var width = this.getStrExactWidth(text.slice(0, this.cursorPos.column), this.domObj.contentScroller[0]);
                            text = this.lineContext.getText(this.cursorPos.line + 1);
                            var column = this.getColumnByWidth(text, width);
                            this.setCursorPos(this.cursorPos.line + 1, column);
                            this.render();
                        }
                        this.clearRnage();
                        break;
                    case Util.keyCode.delete: //delete
                        this.deleteContent(Util.keyCode.delete);
                        break;
                    case Util.keyCode.backspace: //backspace
                        this.deleteContent(Util.keyCode.backspace);
                        break;
                }
            }
        });
        this.domObj.textarea.on('compositionstart', (e) => {
            clearTimeout(this.domObj.textarea.compositionendTimer);
            this.domObj.textarea.compositionstart = true;
        });
        this.domObj.textarea.on('compositionend', (e) => {
            if (this.domObj.textarea.compositionstart) {
                var text = this.domObj.textarea.val();
                if (text) {
                    this.insertContent(this.domObj.textarea.val());
                    this.domObj.textarea.val('');
                }
            }
            //避免有些浏览器compositionend在input事件之前触发的bug
            this.domObj.textarea.compositionendTimer = setTimeout(() => {
                this.domObj.textarea.compositionstart = false;
            }, 100);
        });
        this.domObj.textarea.on('input', (e) => {
            if (!this.domObj.textarea.compositionstart) {
                var text = this.domObj.textarea.val();
                if (text) {
                    this.insertContent(this.domObj.textarea.val());
                    this.domObj.textarea.val('');
                }
            }
        });
        this.domObj.textarea.on('blur', () => {
            this.stopCursorTwinkle();
        });
        this.domObj.textarea.on('focus', () => {
            this.startCursorTwinkle();
        });
        this.domObj.textarea.on('copy', (e) => {
            var mime = window.clipboardData ? "Text" : "text/plain";
            var clipboardData = e.originalEvent.clipboardData || window.clipboardData;
            if (this.selectedRange) {
                var text = this.lineContext.getRangeText(this.selectedRange.start, this.selectedRange.end);
                clipboardData.setData(mime, text);
                //返回false阻止默认复制，否则setData无效
                return false;
            }
        });
        this.domObj.textarea.on('paste', (e) => {
            var mime = window.clipboardData ? "Text" : "text/plain";
            var clipboardData = e.originalEvent.clipboardData || window.clipboardData;
            var copyText = '';
            copyText = clipboardData.getData(mime);
            this.insertContent(copyText);
            //如果不返回false，textarea会接受大量数据，网页会很卡
            return false;
        });
    }
    //滚动事件
    bindScrollEvent() {
        $(window).on('resize', (e) => {
            this.scrollWrapHeight = this.domObj.vScrollWrap.height();
            this.render(true);
        });
        this.domObj.contentContainer.on('wheel', (e) => {
            var scrollTop = this.scrollTop + e.originalEvent.deltaY;
            e.preventDefault();
            this.setScrollTop(scrollTop);
            this.domObj.hScrollWrap[0].scrollLeft += e.originalEvent.deltaX;
            //scrollTop有效
            if (this.domObj.vScrollWrap[0].realScrollTop > 0) {
                this.domObj.vScrollWrap[0].realScrollTop = -1
                this.scrollTop = scrollTop;
                this.render(true);
            }
        });
        this.domObj.vScrollWrap.on('scroll', (e) => {
            if (this.domObj.vScrollWrap[0].realScrollTop < 0) {
                this.domObj.vScrollWrap[0].realScrollTop = 0;
                return;
            }
            var scrollTop = this.getScrollTop(this.domObj.vScrollWrap[0].scrollTop);
            if (scrollTop != this.scrollTop) {
                this.scrollTop = scrollTop;
                this.render(true);
            }
            if (this.domObj.contentScroller.startSelect && this.selectedRange) {
                this.selectedRange.endPos = this.getEventPos(e);
                this.renderSelectedBg();
            }
            this.setFocus(true);
        });
        this.domObj.hScrollWrap.on('scroll', (e) => {
            if (this.domObj.contentScroller[0].scrollLeft != this.domObj.hScrollWrap[0].scrollLeft) {
                this.domObj.contentScroller[0].scrollLeft = this.domObj.hScrollWrap[0].scrollLeft;
                this.renderTextarea();
            }
            if (this.domObj.contentScroller.startSelect && this.selectedRange) {
                this.selectedRange.endPos = this.getEventPos(e);
                this.renderSelectedBg();
            }
            this.setFocus(true);
        });
        this.domObj.contentScroller.on('scroll', (e) => {
            if (this.domObj.hScrollWrap[0].scrollLeft != this.domObj.contentScroller[0].scrollLeft) {
                this.domObj.hScrollWrap[0].scrollLeft = this.domObj.contentScroller[0].scrollLeft;
            }
        });
    }
    //行号事件
    bindNumlEvent() {
        this.domObj.numContainer.on('click', (e) => {
            var $num = $(e.target).parent('.subjs-line-num');
            if ($num.hasClass('fold-arrow-open')) {
                var line = $num.attr('line');
                var lineObj = this.lineContext.getLine(line);
                this.lineContext.setFoldTag(line, -1);
                if (this.cursorPos.line > lineObj.foldTagToken.line && this.cursorPos.line < lineObj.foldTagToken.matchedNode.line) {
                    this.setCursorPos(lineObj.foldTagToken.line, lineObj.text.length);
                }
                this.render(false, true);
            } else if ($num.hasClass('fold-arrow-close')) {
                var line = $num.attr('line');
                this.lineContext.setFoldTag(line, 1);
                this.render(false, true);
            }
        });
    }
}

export default Editor;