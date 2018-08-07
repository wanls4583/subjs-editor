import Util from './util.js';
import $ from 'jquery';

///////////
// 文本容器类 //
///////////
class LinesContext {
    /**
     * @param  {Editor} Editor 文本编辑类
     */
    constructor(Editor) {
        this.Editor = Editor;
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
        this._width[line - 1] = Util.getStrWidth(txt, this.Editor.charWidth, this.Editor.fullAngleCharWidth);
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
        this._width[line - 1] = Util.getStrWidth(txt, this.Editor.charWidth, this.Editor.fullAngleCharWidth);
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
                <div style="position:relative;margin:0;height:' + this.Editor.charHight + 'px;" class="pre_code_line">\
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

export default LinesContext;