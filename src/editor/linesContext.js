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
            //     wholeLineDec: '', //存储整行修饰
            //     foldObj: {
            //         startPos: null, //折叠开始行列坐标
            //         endPos: null, //折叠结束行列坐标
            //         foldText: '' //折叠的内容
            //     }
            // }
        ];
        this.closeFolds = [];
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
        var arr = []
        if(Object.prototype.toString.call(txt)  === '[object Array]'){
            arr = txt;
        }else{
            arr = [txt];
        }
        for(var i=0,length = arr.length; i<length; i++){
            txt = arr[i];
            arr[i] = {
                content: txt,
                htmlDom: null,
                width: 0,
                lineDecs: [],
                priorLineDecs: [],
                lineWholeDec: '',
                foldObj: {
                    startPos: null,
                    endPos: null,
                    foldText: ''
                }
            }
            arr[i].width = Util.getStrWidth(txt, this.Editor.charWidth, this.Editor.fullAngleCharWidth);
            if (arr[i].width > this.maxObj.width) {
                this.maxObj.width = arr[i].width;
                this.maxObj.line = line + i;
            } else if (line + i == this.maxObj.line) {
                this.maxObj.line = line + i + 1;
            }
        }
        this.context = this.context.slice(0,line - 1).concat(arr).concat(this.context.slice(line - 1));
    }
    /**
     * 删除多行（大数据处理时提高效率）
     * @param  {Number} startLine       开始行
     * @param  {Number} endLine         结束行
     */
    delete(startLine, endLine) {
        this.context.splice(startLine - 1, endLine - startLine + 1);
        this.findMax = true;
        //删除折叠的行
        for (var i = 0; i < this.closeFolds.length; i++) {
            var obj = this.closeFolds[i];
            if (obj.line >= startLine && obj.line <= endLine) {
                this.closeFolds.splice(i, 1);
                i--;
            }
        }
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
            $dom.find('.code').html(this._engine(this.context[line - 1].content, this.context[line - 1].lineDecs, this.context[line - 1].priorLineDecs, this.context[line - 1].lineWholeDec));
            //设置更新标识
            if (!$dom.hasUpdate) {
                $dom.hasUpdate = true;
            }
            //折叠省略号
            if(this.getFoldText(line)){
                $dom.find('.code').append('<i class="ellipsis">..</i>')
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
     * 设置折叠区域行列坐标
     * @param {Number} line     行号
     * @param {Object} startPos 开始坐标
     * @param {Object} endPos   结束坐标
     */
    setFoldPos(line, startPos, endPos) {
        this.context[line - 1].foldObj.startPos = startPos;
        this.context[line - 1].foldObj.endPos = endPos;
    }
    /**
     * 获取折叠区域坐标
     * @param  {Number} line 行号
     * @return {Object}      开始结束坐标
     */
    getFoldPos(line) {
        if (this.context.length >= line) {
            var foldObj = this.context[line - 1].foldObj;
            if(foldObj.startPos){
                return {
                    startPos: foldObj.startPos,
                    endPos: foldObj.endPos
                }
            }
        }
    }
    /**
     * 设置折叠内容
     * @param {Number} line    行号
     * @param {String} content 折叠内容
     */
    setFoldText(line, content) {
        var foldObj = this.context[line - 1].foldObj;
        foldObj.foldText = content;
        if (content) {
            this.closeFolds.push({
                line: line,
                length: content.match(/\n/g).length + 1
            });
            //折叠记录，用于计算行号
            this.closeFolds.sort(function(arg1, arg2) {
                if (arg1.line < arg2.line) {
                    return -1;
                } else if (arg1.line > arg2.line) {
                    return 1
                }
                return 0;
            });
        } else {
            for (var i = 0, length = this.closeFolds.length; i < length; i++) {
                if (this.closeFolds[i].line == line) {
                    this.closeFolds.splice(i, 1);
                    return;
                }
            }
        }
    }
    /**
     * 获取折叠的内容
     * @param  {Number} line 行号
     * @return {String}      折叠内容
     */
    getFoldText(line) {
        return this.context.length >= line && this.context[line - 1].foldObj.foldText || '';
    }
    /**
     * 获取行号对应的折叠后的行号
     * @param  {Number} line 行号
     * @return {Number}      计算行号
     */
    getLineNum(line) {
        var realLine = line;
        for (var i = 0, length = this.closeFolds.length; i < length; i++) {
            if (this.closeFolds[i].line < line) {
                realLine += this.closeFolds[i].length - 1;
            } else {
                break;
            }
        }
        return realLine;
    }
}

export default LinesContext;