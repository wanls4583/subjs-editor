import Util from './util.js';
import { TokenLink, TokenNode } from './token_link.js';
import TaskLink from './task_link.js';
import CommentHighLight from './comment_highlight.js';
import Fold from './fold.js';

////////////
// 高亮基础模板 //
////////////
class Mode {
    /**
     * @param {LinesContext} linesContext [行对应的内容]
     */
    constructor(editor) {
        var self = this;
        this.linesContext = editor.linesContext;
        this.linesContext.setDecEngine(Mode.decEngine); //设置修饰对象的处理引擎
        this.commentHighLight = new CommentHighLight(editor, Mode.pairRules);
        this.fold = new Fold(editor, Mode.foldRules);
        this.taskList = new TaskLink(1000, 100, function(line) {
            self.updateLine(line);
        });
    }
    //单行代码高亮
    highlight(currentLine) {
        var self = this;
        var lineDecoration = []; //一行中已处理过的区域
        //单行匹配
        for (var i = 0; i < Mode.rules.length; i++) {
            var reg = Mode.rules[i].reg,
                token = Mode.rules[i].token,
                exclude = Mode.rules[i].exclude,
                callback = Mode.rules[i].callback,
                str = this.linesContext.getText(currentLine);
            var result = Util.execReg(reg, exclude, str, callback);
            for (var j = 0; j < result.length; j++) {
                result[j].token = token;
            }
            //检查是否和之前的修饰有交叉，有则覆盖
            for (var j = 0; j < result.length; j++) {
                var obj = result[j];
                for (var m = 0; m < lineDecoration.length; m++) {
                    if (!(obj.start > lineDecoration[m].end || obj.end < lineDecoration[m].start)) {
                        lineDecoration.splice(m, 1);
                        m--;
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
        this.linesContext.setLineDec(currentLine, lineDecoration);
        this.linesContext.updateDom(currentLine);
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
        for (var i = startLine; i <= endLine; i++) {
            this.taskList.insert(i);
        }
        this.setPriorLine(endLine);
        this.commentHighLight.onInsertBefore(startLine, endLine);
        this.fold.onInsertBefore(startLine, endLine);
    }
    /**
     * 插入新行之后触发[外部接口]
     * @param  {Number} startLine 开始行号
     * @param  {Number} endLine   结束行号
     */
    onInsertAfter(startLine, endLine) {
        this.taskList.process();
        this.commentHighLight.taskList.process(startLine, endLine);
        this.fold.taskList.process(startLine, endLine);
    }
    /**
     * 删除行之前触发[外部接口]
     * @param  {Number} startLine 行号
     */
    onDeleteBefore(startLine, endLine) {
        this.commentHighLight.onDeleteBefore(startLine, endLine);
        this.fold.onDeleteBefore(startLine, endLine);
    }
    /**
     * 删除行之后触发[外部接口]
     * @param  {Number} startLine 开始行号
     * @param  {Number} endLine   结束行号
     */
    onDeleteAfter(startLine, endLine) {
        this.updateLine(startLine);
        this.commentHighLight.onDeleteAfter(startLine, endLine);
        this.fold.onDeleteAfter(startLine, endLine);
    }
    /**
     * 设置优先处理行[外部接口]
     * @param {Nunber} endLine 优先处理的末行
     * @param {Boolean} ifProcess 是否立刻处理
     * @param  {String} type 更新类型
     */
    setPriorLine(endLine, ifProcess, type) {
        if (type == 'fold') {
            this.fold.setPriorLine(endLine, ifProcess);
        } else if (type == 'pair') {
            this.commentHighLight.setPriorLine(endLine, ifProcess);
        } else {
            this.taskList.setPriorLine(endLine, ifProcess);
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
            return `${indent}<span class="${lineWholeToken}"">${content}</span>`;
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