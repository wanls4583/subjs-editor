import Util from './util.js';
import { TokenLink, TokenNode } from './tokenlink.js';
import TaskLink from './tasklink.js';
import CONST from '../common/const_var.js';

class FoldHightLight {
    constructor(editor, rules) {
        var self = this;
        this.rules = rules;
        this.editor = editor;
        this.linesContext = editor.linesContext;
        this.tokenLists = []; //折叠符号记录
        this.taskList = new TaskLink(1000, function(line) {
            self.updateLine(line);
        }); //折叠待处理队列
        for (var i = 0; i < this.rules.length; i++) {
            this.tokenLists.push(new TokenLink(1000));
        }
    }
    //代码折叠标记
    highlight(startLine) {
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
                        str = self.linesContext.getText(startLine);
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
                        tmp.suffixToken = next;
                        next.preToken = tmp;
                        if (tmp.line < next.line) {
                            tmp.foldType = CONST.FOLD_OPEN_TYPE;
                        }
                        self.renderFold(tmp);
                        if (tmp == tokenNode) {
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
                        tmp.preToken = pre;
                        pre.suffixToken = tmp;
                        if (pre.line < tmp.line) {
                            pre.foldType = CONST.FOLD_OPEN_TYPE;
                        }
                        self.renderFold(pre);
                        if (tmp == tokenNode) {
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
                //有可能已经 highlight 过一次，此时 tokenNode.suffixToken.preToken 有可能不再等于 tokenNode
                if (tokenNode.type == CONST.FOLD_PRE_TYPE && tokenNode.suffixToken && tokenNode.suffixToken.preToken == tokenNode) {
                    recheckLines.push(tokenNode.suffixToken.line);
                    this.undoFold(tokenNode);
                //有可能已经 highlight 过一次，此时 tokenNode.preToken.suffixToken 有可能不再等于 tokenNode
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
        this.linesContext.setFoldType(preToken.line, preToken.foldType);
        if (preToken.line >= this.editor.firstLine && preToken.line < this.editor.firstLine + this.editor.maxVisualLine) {
            this.editor.leftNumDom[preToken.line - this.editor.firstLine].addClass('fold_arrow_open');
        }
    }
    /**
     * 删除preToken挂载的折叠按钮
     * @param  {Object} preToken 折叠头
     */
    undoFold(preToken) {
        if (preToken.suffixToken) {
            if (preToken.suffixToken.line > preToken.line) {
                this.linesContext.setFoldType(preToken.line, 0);
            }
            preToken.foldType = 0;
            preToken.suffixToken.preToken = null;
            preToken.suffixToken = null;
            if (preToken.line >= this.editor.firstLine && preToken.line < this.editor.firstLine + this.editor.maxVisualLine) {
                this.editor.leftNumDom[preToken.line - this.editor.firstLine].removeClass('fold_arrow_open');
            }
        }
    }
    /**
     * 当更新一行时触发[外部接口]
     * @param  {Number} line 行号
     * @param  {String} type 更新类型
     */
    updateLine(line) {
        this.highlight(line);
    }
    //折叠匹配插入前回调
    onInsertBefore(startLine, endLine) {
        var recheckLines = [startLine],
            self = this;
        if (endLine > startLine) {
            var preFlag = false,
                suffixFlag = false;
            for (var i = 0; i < this.rules.length; i++) {
                var tokenList = this.tokenLists[i];
                var head = tokenList.head.next;
                while (head) {
                    if (head.line > startLine) {
                        head.line += endLine - startLine;
                        if (!suffixFlag && head.type == CONST.FOLD_SUFFIX_TYPE) {
                            //最近的下一个 suffixToken，需要重置
                            /*
                                //preToken
                                //...
                                //startLine
                                //...
                                //suffixToken(head)
                            */
                            if (head.preToken && head.preToken.line < startLine) {
                                recheckLines = recheckLines.concat(this.undoFoldLine(head.line));
                            }
                            suffixFlag = true;
                        }
                        //最近的前一个 preToken，需要重置
                        /*
                            //preToken(head)
                            //...
                            //startLine
                            //...
                            //suffixToken
                        */
                    } else if (!preFlag && head.type == CONST.FOLD_PRE_TYPE && (head == this.endToken || head.suffixToken && head.suffixToken.line > startLine)) {
                        recheckLines = recheckLines.concat(this.undoFoldLine(head.line));
                        preFlag = true;
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
        for (var i = 0; i < recheckLines.length; i++) {
            this.taskList.insert(recheckLines[i]);
        }
        //同步插入
        this.taskList.insert(recheckLines[recheckLines.length - 1], true);
        this.setPriorLine(recheckLines[recheckLines.length - 1]);
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
            var preFlag = false,
                suffixFlag = false;
            for (var i = 0; i < this.rules.length; i++) {
                var tokenList = this.tokenLists[i];
                var head = tokenList.head.next;
                while (head) {
                    //寻找匹配区域和边界交叉的preToken，需要重置
                    if (head.type == CONST.FOLD_PRE_TYPE) {
                        /*
                            //preToken(head)
                            //...
                            //startLine
                            //...
                            //suffixToken
                        */
                        if (!preFlag && head.line < startLine && head.suffixToken && head.suffixToken.line >= startLine) {
                            recheckLines = recheckLines.concat(this.undoFoldLine(head.line));
                            preFlag = true;
                            /*
                                //preToken(head)
                                //...
                                //endLine
                                //...
                                //suffixToken
                            */
                        } else if (!suffixFlag && head.line <= endLine &&  head.suffixToken && head.suffixToken.line > endLine) {
                            recheckLines = recheckLines.concat(this.undoFoldLine(head.line));
                            suffixFlag = true;
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
        for (var i = 0; i < recheckLines.length; i++) {
            this.taskList.insert(recheckLines[i]);
        }
        //同步插入
        this.taskList.insert(recheckLines[recheckLines.length - 1], true);
        this.setPriorLine(recheckLines[recheckLines.length - 1]);
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
     * @param  {String} type 更新类型
     */
    setPriorLine(endLine, type) {
        this.taskList.setPriorLine(endLine);
    }
}

export default FoldHightLight;