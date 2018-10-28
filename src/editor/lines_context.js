import Util from './util.js';
import $ from 'jquery';

///////////
// 文本容器类 //
///////////
class LinesContext {
    /**
     * @param  {Function} Editor 文本编辑类
     * @param  {Editor} editor 文本编辑类实例
     */
    constructor(Editor, editor) {
        this.Editor = Editor;
        this.editor = editor;
        this.maxObj = { line: 1, width: 0 }; //文本当前最大宽度
        this.findMax = false; //是否要重新计算最大宽度
        this._engine = function(content) { return Util.htmlTrans(content) }; //默认处理引擎直接返回传入的内容
        this.context = [];
        this.closeFolds = [];
        this.tabSpace = (function(tabsize) {
            var str = '';
            for (var i = 0; i < tabsize; i++) {
                str += ' ';
            }
            return str;
        })(this.editor.config.tabsize);
    }
    //在指定行添加一行文本
    add(line, txt) {
        var arr = []
        if (Object.prototype.toString.call(txt) === '[object Array]') {
            arr = txt;
        } else {
            arr = [txt];
        }
        for (var i = 0, length = arr.length; i < length; i++) {
            txt = arr[i].replace(/\t/g, this.tabSpace); //处理制表符
            arr[i] = {
                content: txt,
                htmlDom: null,
                width: 0,
                lineDecs: [],
                lighted: false, //是否已高亮过
                priorLineDecs: [],
                lineWholeDec: '',
                error: '',
                tokens: [],
                parsed: false, //是否已经分析过词法
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
        this.context = this.context.slice(0, line - 1).concat(arr).concat(this.context.slice(line - 1));
    }
    /**
     * 删除多行（大数据处理时提高效率）
     * @param  {Number} startLine       开始行
     * @param  {Number} endLine         结束行
     */
    delete(startLine, endLine) {
        //清空与删除区域交叉的折叠内容
        var lines = [];
        for (var i = 0; i < this.closeFolds.length; i++) {
            var obj = this.closeFolds[i];
            if (obj.line >= startLine && obj.line <= endLine) {
                lines.push(obj.line);
            }
        }
        for (var i = 0; i < lines.length; i++) {
            this.setFoldText(lines[i], '');
        }
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
            $dom.find('.code').html(this._engine(this.context[line - 1].content, this.context[line - 1].lineDecs, this.context[line - 1].priorLineDecs, this.context[line - 1].lineWholeDec));
            //设置更新标识
            if (!$dom.hasUpdate) {
                $dom.hasUpdate = true;
            }
            //折叠省略号
            if (this.getFoldText(line)) {
                $dom.find('.code').append('<i class="ellipsis">..</i>')
            }
        }
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
    /**
     * 获取一行的计算文本
     * @param  {Number} line 行号
     * @return {String}      文本
     */
    getText(line) {
        return this.context.length >= line && this.context[line - 1].content;
    }
    /**
     * 获取一行的计算文本（该行可能已经折叠）
     * @param  {Number} line 行号
     * @return {String}      文本
     */
    getFullText(line) {
        return this.getText(line) + this.getFoldText(line);
    }
    /**
     * 获取范围内的文本
     * @param  {Object} startPos 开始行列坐标
     * @param  {Object} endPos   结束行列坐标
     * @return {String}          范围内的文本
     */
    getRangeText(startPos, endPos) {
        var str = this.getFullText(startPos.line),
            lineText = this.getText(startPos.line),
            endStr = '';
        if (startPos.line == endPos.line && lineText.length >= endPos.column) {
            str = str.substring(startPos.column, endPos.column);
        } else {
            startPos.column = startPos.column > lineText.length ? lineText.length : startPos.column;
            str = str.substr(startPos.column);
        }
        for (var line = startPos.line + 1; line < endPos.line; line++) {
            str += '\n' + this.getFullText(line);
        }
        if (endPos.line > startPos.line) {
            endStr = this.getFullText(endPos.line);
            endStr = '\n' + endStr.substring(0, endPos.column);
        }
        return str + endStr;
    }
    /**
     * 设置行内修饰
     * @param {Number} line       行号
     * @param {Object} decoration 修饰对象
     */
    setLineDec(line, decoration) {
        this.context[line - 1].lineDecs = decoration || [];
        this.context[line - 1].lighted = true;
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
     * 撤销行内修饰
     * @param  {Number} line 行号
     */
    resetLineDec(line) {
        this.context[line - 1].lineDecs = [];
        this.context[line - 1].lighted = false;
    }
    /**
     * 是否已经高亮过
     * @param  {Number} line 行号
     * @return {Object}
     */
    hasHighlight(line) {
        return this.context.length >= line && this.context[line - 1].lighted;
    }
    /**
     * 撤销词法
     * @param  {Number} line 行号
     */
    resetTokens(line) {
        this.context[line - 1].tokens = [];
        this.context[line - 1].parsed = false;
    }
    /**
     * 设置词法
     * @param {Number} line     行号
     * @param {Array}  tokens   词法数组
     */
    setTokens(line, tokens) {
        this.context[line - 1].tokens = tokens || [];
        this.context[line - 1].parsed = true;
    }
    /**
     * 获取行内的修饰
     * @param  {Number} line 行号
     * @return {Array}       该行对应的词法数组
     */
    getTokens(line) {
        return this.context.length >= line && this.context[line - 1].tokens;
    }
    /**
     * 设置词法错误信息
     * @param {Number} line  行号
     * @param {String} error 错误信息
     */
    setError(line, error) {
        this.context[line - 1].error = error;
    }
    /**
     * 获取词法错误信息
     * @param  {Number} line 行号
     * @return {String}      
     */
    getError(line) {
        return this.context.length >= line && this.context[line - 1].error;
    }
    /**
     * 是否已经进行过词法分析
     * @param  {Number} line 行号
     * @return {Boolean}
     */
    hasParsed(line) {
        return this.context.length >= line && this.context[line - 1].parsed;
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
            if (this.context[line - 1].priorLineDecs[i].start == decoration.start || this.context[line - 1].priorLineDecs[i].end == decoration.end) {
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
            if (foldObj.startPos) {
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
            var length = content.match(/\n/g).length;
            for (var i = 0; i < this.closeFolds.length; i++) {
                if (this.closeFolds[i].line > line) {
                    if (this.closeFolds[i].line + this.closeFolds[i].length < line + length) { //内部的折叠直接删除
                        this.closeFolds.splice(i);
                        i--;
                    } else { //重置其后折叠行记录的行号
                        this.closeFolds[i].line -= length;
                    }
                }
            }
            this.closeFolds.push({
                line: line,
                length: length
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
                    length = this.closeFolds[i].length;
                    //重置其后折叠行记录的行号
                    for (var j = 0, _length = this.closeFolds.length; j < _length; j++) {
                        if (this.closeFolds[j].line > line) {
                            this.closeFolds[j].line += length;
                        }
                    }
                    this.closeFolds.splice(i, 1);
                    return;
                }
            }
        }
        this.updateDom(line); //更新省略号
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
                realLine += this.closeFolds[i].length;
            } else {
                break;
            }
        }
        return realLine;
    }
}

export default LinesContext;