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
        this.maxObj = { line: 1, width: 0 }; //文本当前最大宽度
        this.findMax = false; //是否要重新计算最大宽度
        this._engine = function(content) { return content }; //默认处理引擎直接返回传入的内容
        this.context = [
        // {
        //     content: '', //存储每行文本
        //     htmlDom: null, //存储每行文本对应的dom元素
        //     width: 0, //记录每行文本的宽度
        //     lineDecs: [], //存储行内修饰
        //     priorLineDecs: [], //存储高优先级行内修饰
        //     wholeLineDec: '' //存储整行修饰
        // }
        ]
    }
    //获取一行文本
    getText(line) {
        return this.context.length >= line && this.context[line - 1].content;
    }
    //更新一行文本
    setText(line, txt) {
        this.context[line - 1].content = txt;
        this.context[line - 1].width = Util.getStrWidth(txt, this.Editor.charWidth, this.Editor.fullAngleCharWidth);
        if (this.context[line - 1].width > this.maxObj.width) {
            this.maxObj.width = this.context[line - 1].width;
            this.maxObj.line = line;
        } else if (line == this.maxObj.line) {
            this.findMax = true;
        }
    }
    //在指定行添加一行文本
    add(line, txt) {
        this.context.splice(line - 1, 0, {
            content: txt,
            htmlDom: null,
            width: 0,
            lineDecs: [],
            priorLineDecs: [],
            lineWholeDec: '',
            foldType: 0
        })
        this.context[line - 1].width = Util.getStrWidth(txt, this.Editor.charWidth, this.Editor.fullAngleCharWidth);
        if (this.context[line - 1].width > this.maxObj.width) {
            this.maxObj.width = this.context[line - 1].width;
            this.maxObj.line = line;
        } else if (line == this.maxObj.line) {
            this.maxObj.line = line + 1;
        }
    }
    /**
     * 删除多行（大数据处理时提高效率）
     * @param  {Number} startLine       开始行
     * @param  {Number} endLine         结束行
     */
    delete(startLine, endLine) {
        this.context.splice(startLine - 1, endLine - startLine + 1);
        this.findMax = true;
    }
    //获取总行数
    getLength() {
        return this.context.length;
    }
    //获取文本最大宽度
    getMaxWidth() {
        if (this.findMax) {
            var max = 0;
            this.maxObj = { line: 1, width: 0 };
            for (var i = 0; i < this.context.length; i++) {
                if (this.context[i].width > max) {
                    this.maxObj.line = i + 1;
                    this.maxObj.width = this.context[i].width;
                    max = this.context[i].width;
                }
            }
            this.findMax = false;
        }
        return this.maxObj.width;
    }
    //获取dom
    getDom(line) {
        if (!this.context[line - 1].htmlDom) {
            var $dom = $('\
                <div style="position:relative;margin:0;height:' + this.Editor.charHight + 'px;" class="pre_code_line">\
                    <div class="code" style="display:inline-block;position:relative;height:100%;min-width:100%;white-space:pre"></div>\
                </div>');
            this.context[line - 1].htmlDom = $dom;
        }
        return this.context[line - 1].htmlDom;
    }
    //更新dom
    updateDom(line) {
        var $dom = this.context[line - 1].htmlDom;
        $dom && ($dom.hasUpdate = false);
        //只有挂载到页面的元素才真正更新
        if ($dom && $dom[0].isConnected) {
            var wholeLineDec = this.context[line - 1].lineWholeDec;
            if (wholeLineDec) {
                $dom.find('.code').html(Util.htmlTrans(this.context[line - 1].content));
                $dom.find('.code').addClass(wholeLineDec);
            } else {
                $dom.find('.code').attr('class', 'code');
                $dom.find('.code').html(this._engine(this.context[line - 1].content, this.context[line - 1].lineDecs, this.context[line - 1].priorLineDecs));
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
        this.context[line - 1].lineDecs = decoration;
    }
    /**
     * 获取行内的修饰
     * @param  {Number} line 行号
     * @return {Object}      该行对应的修饰对象
     */
    getLineDec(line) {
        return this.context.length >= line && this.context[line - 1].lineDecs;
    }
    /**
     * 设置高优先级行内修饰
     * @param {Number} line       行号
     * @param {Object} decoration 修饰对象
     */
    setPriorLineDecs(line, decoration) {
        this.context[line - 1].priorLineDecs = this.context[line - 1].priorLineDecs || [];
        for (var i = 0; i < this.context[line - 1].priorLineDecs.length; i++) {
            if (this.context[line - 1].priorLineDecs[i].start == decoration.start || this.context[line - 1].priorLineDecs[i].end == decoration.end) {
                this.context[line - 1].priorLineDecs.splice(i, 1);
                i--;
            }
        }
        this.context[line - 1].priorLineDecs.push(decoration);
    }
    /**
     * 删除优先级行内修饰
     * @param  {[type]} line       [description]
     * @param  {[type]} decoration [description]
     * @return {[type]}            [description]
     */
    delPriorLineDecs(line, decoration) {
        this.context[line - 1].priorLineDecs = this.context[line - 1].priorLineDecs || [];
        for (var i = 0; i < this.context[line - 1].priorLineDecs.length; i++) {
            if (!this.context[line - 1].priorLineDecs[i]) {
                debugger;
            }
            if (this.context[line - 1].priorLineDecs[i].start == decoration.start && this.context[line - 1].priorLineDecs[i].end == decoration.end) {
                this.context[line - 1].priorLineDecs.splice(i, 1);
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
        return this.context.length >= line && this.context[line - 1].priorLineDecs;
    }
    /**
     * 添加整行修饰
     * @param {Number} line       行号
     * @param {String} className  class
     */
    setWhoeLineDec(line, className) {
        this.context[line - 1].lineWholeDec = className;
    }
    /**
     * 获取整行修饰
     * @param  {Number} line 行号
     * @return {Array}       该行对应的整行修饰数组
     */
    getWholeLineDec(line) {
        return this.context.length >= line && this.context[line - 1].lineWholeDec;
    }
    /**
     * 设置修饰对象的处理引擎
     * @param {Function} engine 修饰对象的处理引擎
     */
    setDecEngine(engine) {
        this._engine = engine;
    }
    /**
     * 设置折叠状态
     * @param  {Number} line 行号
     */
    setFoldType(line, foldType){
        this.context[line - 1].foldType =  foldType;
    }
    /**
     * 获取折叠状态
     * @param  {Number} line 行号
     * @return {Number}      该行对应的折叠状态
     */
    getFoldType(line){
        return this.context.length >= line && this.context[line - 1].foldType;
    }
}

export default LinesContext;