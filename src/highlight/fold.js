import Util from './util.js';
import { TokenLink, TokenNode } from './token_link.js';
import TaskLink from './task_link.js';
import CONST from '../common/const_var.js';

class FoldHightLight {
    constructor(editor, rules) {
        var self = this;
        this.rules = rules;
        this.editor = editor;
        this.tokenLists = []; //折叠符号记录
        this.taskList = new TaskLink(100, function(line) {
            self.updateLine(line);
        }); //折叠待处理队列
        for (var i = 0; i < this.rules.length; i++) {
            this.tokenLists.push(new TokenLink(1000));
        }
    }
    //折叠代码
    fold(startLine) {
        var nodes = [],
            self = this;
        //先撤销
        this.undoFoldLine(startLine);
        _doMatch();
        _matchToken();
        //查找多行匹配标识
        function _doMatch() {
            for (var i = 0; i < self.rules.length; i++) {
                self.tokenLists[i].del(startLine);
            }
            __exec(true);
            __exec(false);
            //正则匹配
            function __exec(ifPre) {
                for (var regIndex = 0; regIndex < self.rules.length; regIndex++) {
                    var reg = ifPre ? self.rules[regIndex].pre : self.rules[regIndex].suffix,
                        token = self.rules[regIndex].token,
                        exclude = ifPre ? self.rules[regIndex].pre_exclude : self.rules[regIndex].suffix_exclude,
                        str = self.editor.linesContext.getText(startLine);
                    var result = Util.execReg(reg, exclude, str);
                    for (var j = 0; j < result.length; j++) {
                        var obj = result[j];
                        var tokenNode = new TokenNode(startLine, obj.start, obj.end, token, ifPre ? 1 : 2, regIndex);
                        //插入顺序链表
                        self.tokenLists[regIndex].insert(tokenNode);
                        nodes.push(tokenNode);
                    }
                }
            }
        }

        function _matchToken() {
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                if (node.type == CONST.FOLD_PRE_TYPE) {
                    _findSuffixToken(node);
                } else {
                    _findPreToken(node);
                }
            }
        }

        function _findSuffixToken(tokenNode) {
            var next = tokenNode.next;
            var stack = [tokenNode];
            while (next) {
                if (next.type == CONST.FOLD_SUFFIX_TYPE) {
                    if (stack[stack.length - 1].type == CONST.FOLD_PRE_TYPE) {
                        var tmp = stack.pop();
                        var recheckNode = null;
                        if (tmp == tokenNode) {
                            if (tmp.suffixToken) {
                                self.undoFold(tmp);
                            }
                            if (next.preToken) {
                                if (next.preToken.line != tokenNode.line) {
                                    recheckNode = next.preToken;
                                }
                                self.undoFold(next.preToken);
                            }
                        }
                        tmp.suffixToken = next;
                        next.preToken = tmp;
                        self.renderFold(tmp);
                        if (tmp == tokenNode) {
                            recheckNode && _findSuffixToken(recheckNode);
                            return;
                        }
                    } else {
                        return;
                    }
                } else {
                    stack.push(next);
                }
                next = next.next;
            }
        }

        function _findPreToken(tokenNode) {
            var pre = tokenNode.pre;
            var stack = [tokenNode];
            while (pre) {
                if (pre.type == CONST.FOLD_PRE_TYPE) {
                    if (stack[stack.length - 1].type == CONST.FOLD_SUFFIX_TYPE) {
                        var tmp = stack.pop();
                        var recheckNode = null;
                        if (tmp == tokenNode) {
                            if (tmp.preToken) {
                                self.undoFold(tmp.preToken);
                            }
                            if (pre.suffixToken) {
                                if (pre.suffixToken.line != tokenNode.line) {
                                    recheckNode = pre.suffixToken;
                                }
                                self.undoFold(pre);
                            }
                        }
                        tmp.preToken = pre;
                        pre.suffixToken = tmp;
                        self.renderFold(pre);
                        if (tmp == tokenNode) {
                            recheckNode && _findPreToken(recheckNode);
                            return;
                        }
                    } else {
                        return;
                    }
                } else {
                    stack.push(pre);
                }
                pre = pre.pre;
            }
        }
    }
    /**
     * 撤销某一行的折叠匹配修饰
     * @param  {Number} line 行号
     * @return {Array}       需要重新检测的行
     */
    undoFoldLine(line) {
        var recheckLines = [];
        for (var i = 0; i < this.rules.length; i++) {
            var tokenList = this.tokenLists[i];
            var tokenNode = tokenList.find(line);
            while (tokenNode && tokenNode.line == line) {
                //有可能已经 fold 过一次，此时 tokenNode.suffixToken.preToken 有可能不再等于 tokenNode
                if (tokenNode.type == CONST.FOLD_PRE_TYPE && tokenNode.suffixToken && tokenNode.suffixToken.preToken == tokenNode) {
                    recheckLines.push(tokenNode.suffixToken.line);
                    this.undoFold(tokenNode);
                    //有可能已经 fold 过一次，此时 tokenNode.preToken.suffixToken 有可能不再等于 tokenNode
                } else if (tokenNode.preToken && tokenNode.preToken.suffixToken == tokenNode) {
                    recheckLines.push(tokenNode.preToken.line);
                    this.undoFold(tokenNode.preToken);
                }
                recheckLines.push(tokenNode.line);
                tokenNode = tokenNode.next;
            }
        }
        return recheckLines;
    }
    /**
     * 根据preToken挂载折叠按钮
     * @param  {Object} preToken 折叠头
     */
    renderFold(preToken) {
        if (preToken.suffixToken.line - preToken.line >= 3) {
            this.editor.linesContext.setFoldPos(preToken.line, preToken, preToken.suffixToken);
        }
        this.editor.updateNum(preToken.line, true);
    }
    /**
     * 删除preToken挂载的折叠按钮
     * @param  {Object} preToken 折叠头
     */
    undoFold(preToken) {
        if (preToken.suffixToken) {
            this.editor.linesContext.setFoldPos(preToken.line, null, null);
            preToken.suffixToken.preToken = null;
            preToken.suffixToken = null;
            this.editor.updateNum(preToken.line, true);
        }
    }
    /**
     * 当更新一行时触发[外部接口]
     * @param  {Number} line 行号
     * @param  {String} type 更新类型
     */
    updateLine(line) {
        this.fold(line);
    }
    //折叠匹配插入前回调
    onInsertBefore(startLine, endLine) {
        var recheckLines = [startLine],
            self = this;
        if (endLine > startLine) {
            for (var i = 0; i < this.rules.length; i++) {
                var tokenList = this.tokenLists[i];
                var head = tokenList.head.next;
                while (head) {
                    //重置匹配区域和新增区域有交叉的行
                    if (head.line > startLine) {
                        head.line += endLine - startLine;
                        if (head.type == CONST.FOLD_SUFFIX_TYPE) {
                            if (head.preToken && head.preToken.line < startLine) {
                                recheckLines = recheckLines.concat(this.undoFoldLine(head.line));
                            }
                        }
                    } else if (head.type == CONST.FOLD_PRE_TYPE && head.suffixToken && head.suffixToken.line > startLine) {
                        recheckLines = recheckLines.concat(this.undoFoldLine(head.line));
                    }
                    head = head.next;
                }
            }
        }
        this.taskList.eachTask(function(taskNode, index) {
            if (taskNode.line) {
                taskNode.line += endLine - startLine;
            } else { //缓存中的待处理行
                taskNode[index] += endLine - startLine;
            }
        }, startLine);
        recheckLines = recheckLines.concat(this.undoFoldLine(startLine));
        for (var i = 0, length = recheckLines.length; i < length; i++) {
            if (recheckLines[i] > startLine) {
                recheckLines[i] += endLine - startLine;
            }
        }
        for (var i = startLine + 1; i <= endLine; i++) {
            recheckLines.push(i);
        }
        Util.sortNum(recheckLines);
        for (var i = 0; i < recheckLines.length -1; i++) {
            this.taskList.insert(recheckLines[i]);
        }
        if (recheckLines.length) {
            //同步插入
            this.taskList.insert(recheckLines[recheckLines.length - 1], true);
            this.setPriorLine(recheckLines[recheckLines.length - 1]);
        }
    }
    /**
     * 插入新行之后触发[外部接口]
     * @param  {Number} startLine 开始行号
     * @param  {Number} endLine   结束行号
     */
    onInsertAfter(startLine, endLine) {
        this.taskList.process();
    }
    /**
     * 删除行之前触发[外部接口]
     * @param  {Number} startLine 行号
     */
    onDeleteBefore(startLine, endLine) {
        var recheckLines = [startLine],
            self = this;
        if (endLine > startLine) {
            for (var i = 0; i < this.rules.length; i++) {
                var tokenList = this.tokenLists[i];
                var head = tokenList.head.next;
                while (head) {
                    //重置匹配区域和删除区域有交叉的行
                    if (head.type == CONST.FOLD_PRE_TYPE) {
                        if (head.line < startLine && head.suffixToken && head.suffixToken.line >= startLine) {
                            recheckLines = recheckLines.concat(this.undoFoldLine(head.line));
                        } else if (head.line <= endLine && head.suffixToken && head.suffixToken.line > endLine) {
                            recheckLines = recheckLines.concat(this.undoFoldLine(head.line));
                        }
                    }
                    if (head.line > endLine) {
                        head.line -= endLine - startLine;
                    } else if (head.line > startLine) {
                        tokenList.del(head);
                    }
                    head = head.next;
                }
            }
        }
        this.taskList.eachTask(function(taskNode, index) {
            if (taskNode.line) {
                if (taskNode.line > endLine) {
                    taskNode.line -= endLine - startLine;
                } else if (taskNode.line > startLine) {
                    self.taskList.del(taskNode);
                }
            } else { //缓存中待处理的行
                if (taskNode[index] > endLine) {
                    taskNode[index] -= endLine - startLine;
                } else if (taskNode[index] > startLine) {
                    taskNode.splice(index, 1);
                }
            }
        }, startLine);
        recheckLines = recheckLines.concat(this.undoFoldLine(startLine));
        for (var i = 0, length = recheckLines.length; i < length; i++) {
            if (recheckLines[i] > endLine) {
                recheckLines[i] -= endLine - startLine;
            }
        }
        Util.sortNum(recheckLines);
        for (var i = 0; i < recheckLines.length -1; i++) {
            this.taskList.insert(recheckLines[i]);
        }
        if (recheckLines.length) {
            //同步插入
            this.taskList.insert(recheckLines[recheckLines.length - 1], true);
            this.setPriorLine(recheckLines[recheckLines.length - 1]);
        }
    }
    /**
     * 删除行之后触发[外部接口]
     * @param  {Number} startLine 开始行号
     * @param  {Number} endLine   结束行号
     */
    onDeleteAfter(startLine, endLine) {
        this.taskList.process();
    }
    /**
     * 设置优先处理行[外部接口]
     * @param {Nunber} endLine 优先处理的末行
     * @param {Boolean} ifProcess 是否立刻处理
     */
    setPriorLine(endLine, ifProcess) {
        this.taskList.setPriorLine(endLine, ifProcess);
    }
    /**
     * 删除折叠行[对外接口]
     * @param  {[type]} line行号
     */
    delFoldLine(line) {
        if (this.editor.linesContext.getFoldPos(line)) {
            var recheckLines = this.undoFoldLine(line);
            this.taskList.del(line);
            //过滤多行匹配中的行
            var filterLines = [];
            for (var i = 0; i < recheckLines.length; i++) {
                if (!this.editor.linesContext.getWholeLineDec(recheckLines[i])) {
                    filterLines.push(recheckLines[i]);
                }
            }
            Util.sortNum(filterLines);
            for (var i = 0; i < filterLines.length; i++) {
                if (filterLines[i] != line) {
                    this.taskList.insert(filterLines[i]);
                }
            }
        }
    }
}

export default FoldHightLight;