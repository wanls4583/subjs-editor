import Util from '../../common/util.js';
import { TokenNode } from './token_link.js';
import TaskLink from '../../common/task_link.js';
import CommentProcessor from './comment.js';
import FoldProcessor from './fold.js';

////////////
// 高亮基础模板 //
////////////
class Mode {
    /**
     * @param {Editor}  Editor       编辑器对象
     * @param {Object}  rules        高亮规则
     * @param {Object}  commentRules 注释规则
     * @param {Boolean} ifHideFold   是否隐藏折叠标记
     */
    constructor(editor, rules, commentRules, ifHideFold) {
        var self = this;
        this.rules = rules;
        this.editor = editor;
        this.editor.linesContext.setDecEngine(Mode.decEngine); //设置修饰对象的处理引擎
        this.commentProcessor = commentRules && new CommentProcessor(editor, commentRules);
        this.foldProcessor = !ifHideFold && new FoldProcessor(editor);
        this.taskList = new TaskLink(100, function(line) {
            if (!self.editor.linesContext.hasHighlight(line)) { //避免重复渲染
                self.updateLine(line);
            }
        });
    }
    /**
     * 高亮一行代码
     * @param  {Number}  currentLine 当前行号
     * @param  {Boolean} delayUpdate 是否延迟更新dom节点
     */
    highlight(currentLine, delayUpdate) {
        var self = this;
        var lineDecoration = []; //一行中已处理过的区域
        //单行匹配
        for (var i = 0; i < this.rules.length; i++) {
            var reg = this.rules[i].reg,
                token = this.rules[i].token,
                exclude = this.rules[i].exclude,
                callback = this.rules[i].callback,
                str = this.editor.linesContext.getText(currentLine);
            var result = Util.execReg(reg, exclude, str, callback);
            for (var j = 0; j < result.length; j++) {
                result[j].token = token;
            }
            //检查是否和之前的修饰有交叉，有则覆盖
            for (var j = 0; j < result.length; j++) {
                var obj = result[j];
                for (var m = 0; m < lineDecoration.length; m++) {
                    if (obj.start <= lineDecoration[m].start && obj.end >= lineDecoration[m].end) {
                        lineDecoration.splice(m, 1);
                        m--;
                    } else if (obj.start >= lineDecoration[m].start && obj.end <= lineDecoration[m].end) {
                        result.splice(j, 1);
                        j--;
                    }
                }
            }
            lineDecoration = lineDecoration.concat(result);
        }
        lineDecoration.sort(function(arg1, arg2) {
            if (arg1.start < arg2.start) {
                return -1
            } else if (arg1.start == arg2.start) {
                return 0;
            } else {
                return 1;
            }
        });
        this.editor.linesContext.setLineDec(currentLine, lineDecoration);
        !delayUpdate && this.editor.linesContext.updateDom(currentLine);
    }
    /**
     * 当更新一行时触发[外部接口]
     * @param  {Number} line 行号
     * @param  {String} type 更新类型
     */
    updateLine(line) {
        this.highlight(line);
    }
    /**
     * 插入新行之前触发[外部接口]
     * @param  {Number} startLine 行号
     */
    onInsertBefore(startLine, endLine) {
        this.commentProcessor && this.commentProcessor.onInsertBefore(startLine, endLine);
        this.foldProcessor && this.foldProcessor.onInsertBefore(startLine, endLine);
    }
    /**
     * 插入新行之后触发[外部接口]
     * @param  {Number} startLine 开始行号
     * @param  {Number} endLine   结束行号
     */
    onInsertAfter(startLine, endLine) {
        for (var i = startLine; i <= endLine; i++) {
            this.editor.linesContext.resetLineDec(i);
        }
        this.commentProcessor && this.commentProcessor.onInsertAfter(startLine, endLine);
        this.foldProcessor && this.foldProcessor.onInsertAfter(startLine, endLine);
    }
    /**
     * 删除行之前触发[外部接口]
     * @param  {Number} startLine 行号
     */
    onDeleteBefore(startLine, endLine) {
        this.commentProcessor && this.commentProcessor.onDeleteBefore(startLine, endLine);
        this.foldProcessor && this.foldProcessor.onDeleteBefore(startLine, endLine);
    }
    /**
     * 删除行之后触发[外部接口]
     * @param  {Number} startLine 开始行号
     * @param  {Number} endLine   结束行号
     */
    onDeleteAfter(startLine, endLine) {
        this.editor.linesContext.resetLineDec(startLine);
        this.commentProcessor && this.commentProcessor.onDeleteAfter(startLine, endLine);
        this.foldProcessor && this.foldProcessor.onDeleteAfter(startLine, endLine);
    }
    /**
     * 设置优先处理行[外部接口]
     * @param {Nunber}  line         优先处理的首行或末行
     * @param {Boolean} ifProcess    是否立刻处理
     * @param {String}  type         更新类型
     * @param {Boolean} delayProcess 是否延迟执行任务
     */
    setPriorLine(line, ifProcess, type, delayProcess) {
        if (type == 'fold') {
            this.foldProcessor && this.foldProcessor.setPriorLine(line, ifProcess);
        } else if (type == 'pair') {
            this.commentProcessor && this.commentProcessor.setPriorLine(line, ifProcess);
        } else {
            var endLine = line;
            var firstLine = line - this.editor.maxVisualLine - 1000;
            firstLine = firstLine < 0 ? 1 : firstLine;
            this.taskList.empty();
            for (var i = firstLine; i <= endLine; i++) {
                this.taskList.insert(i);
            }!delayProcess && this.taskList.process();
        }
    }
    /**
     * 修饰引擎，用来处理修饰，生成HTML字符串
     * @param  {String} content         一行内容
     * @param  {Object} lineToken       修饰对象
     * @param  {String} lineWholeToken  整行修饰
     * @return {String}                 HTML字符串
     */
    static decEngine(content, lineToken, priorLineToken, lineWholeToken) {
        //行首的对齐修饰
        var indentToken = [];
        for (var i = 0; i < lineToken.length; i++) {
            if (lineToken[i].token == 'indent') {
                indentToken.push(lineToken[i]);
            } else {
                break;
            }
        }
        //该行为整行修饰
        if (lineWholeToken) {
            var indent = '';
            if (indentToken.length) {
                var index = indentToken[indentToken.length - 1].end;
                indent = content.substring(0, index + 1);
                indent = _render(indent, indentToken);
                content = content.substring(index + 1);
            }
            return `${indent}<span class="${lineWholeToken}">${Util.htmlTrans(content)}</span>`;
        } else {
            return _render(content, lineToken, priorLineToken, indentToken)
        }

        function _render(content, lineToken, priorLineToken, indentToken) {
            //处理HTML转义'>,<'--'&gt;,&lt;'
            var reg = />|</g,
                match = null,
                indexs = [],
                copyToken = Util.copyObj(lineToken); //避免原始修饰start被修改
            while (match = reg.exec(content)) {
                indexs.push(match.index);
            }
            //高优先级修饰覆盖(多行匹配的头尾修饰)
            if (priorLineToken && priorLineToken.length) {
                //防止行首对齐修饰被覆盖
                if (indentToken && indentToken.length) {
                    var end = indentToken[indentToken.length - 1].end;
                    for (var i = 0; i < priorLineToken.length; i++) {
                        if (priorLineToken[i].start <= end) {
                            priorLineToken[i].start = end + 1;
                        }
                        if (priorLineToken[i].end <= end) {
                            priorLineToken.splice(i);
                            i--;
                        }
                    }
                }
                for (var i = 0; i < priorLineToken.length; i++) {
                    var tokenNode = priorLineToken[i];
                    for (var j = 0; j < copyToken.length; j++) {
                        var obj = copyToken[j];
                        //有交叉则删除
                        if (!(obj.end < tokenNode.start || obj.start > tokenNode.end)) {
                            copyToken.splice(j, 1);
                            j--;
                        }
                    }
                    copyToken.push(tokenNode);
                    copyToken.sort(function(arg1, arg2) {
                        if (arg1.start < arg2.start) {
                            return -1
                        } else if (arg1.start == arg2.start) {
                            return 0;
                        } else {
                            return 1;
                        }
                    });
                }
            }
            //避免原始修饰start被修改
            copyToken = Util.copyObj(copyToken);
            //倒序移动位置
            for (var i = indexs.length - 1; i >= 0; i--) {
                var index = indexs[i];
                for (var j = copyToken.length - 1; j >= 0; j--) {
                    var obj = copyToken[j];
                    if (obj.start > index) {
                        obj.start += 3;
                    }
                    if (obj.end >= index) {
                        obj.end += 3;
                    }
                }
            }
            content = Util.htmlTrans(content);
            //生成HTML
            for (var i = copyToken.length - 1; i >= 0; i--) {
                var obj = copyToken[i];
                content = Util.insertStr(content, obj.end + 1, '</span>');
                content = Util.insertStr(content, obj.start, '<span class="' + obj.token + '">');
            }
            return content;
        }
    }
}

export default Mode;