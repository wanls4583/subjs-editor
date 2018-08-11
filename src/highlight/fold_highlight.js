import Util from './util.js';
import { TokenLink, TokenNode } from './tokenlink.js';
import TaskLink from './tasklink.js';

class FoldHightLight {
    constructor(linesContext, rules) {
        var self = this;
        this.rules = rules;
        this.linesContext = linesContext;
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
                if (node.type == 1) {
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
                if (next.type == 2) {
                    if (stack[stack.length - 1].type == 1) {
                        var tmp = stack.pop();
                        if (tmp == tokenNode) {
                            tokenNode.suffixToken = next;
                            next.preToken = tokenNode;
                            if (tokenNode.line < next.line) {
                                tokenNode.foldType = 1;
                            }
                            tokenNode.foldType = 1;
                            self.renderFold(tokenNode);
                            return;
                        }
                    } else {
                        return;
                    }
                }
                stack.push(next);
                next = next.next;
            }
        }

        function _findPreToken(tokenNode) {
            var pre = tokenNode.pre;
            var stack = [tokenNode];
            while (pre) {
                if (pre.type == 1) {
                    if (stack[stack.length - 1].type == 2) {
                        var tmp = stack.pop();
                        if (tmp == tokenNode) {
                            tokenNode.preToken = pre;
                            pre.suffixToken = tokenNode;
                            if (pre.line < tokenNode.line) {
                                pre.foldType = 1;
                            }
                            self.renderFold(pre);
                            return;
                        }
                    } else {
                        return;
                    }
                }
                stack.push(pre);
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
                if (tokenNode.type == 1) {
                    if (tokenNode.suffixToken) {
                        recheckLines.push(tokenNode.suffixToken.line);
                    }
                    this.undoFold(tokenNode);
                } else if (tokenNode.preToken) {
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
            preToken.suffixToken.preToken = null;
            preToken.suffixToken = null;
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
                        if (!suffixFlag && head.type == 2) {
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
                    } else if (!preFlag && head.type == 1 && (head == this.endToken || head.suffixToken && head.suffixToken.line > startLine)) {
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
        for (var i = 0; i < recheckLines.length - 1; i++) {
            this.taskList.insert(recheckLines[i]);
        }
        if (recheckLines.length) {
            //同步插入
            this.taskList.insert(recheckLines[recheckLines.length - 1], true);
            setTimeout(function() {
                //设置优先处理行，处理顺序从后到前
                self.setPriorLine(recheckLines[recheckLines.length - 1], 'fold');
            });
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
    onDeleteBefore(startLine, endLine) {}
    /**
     * 删除行之后触发[外部接口]
     * @param  {Number} startLine 开始行号
     * @param  {Number} endLine   结束行号
     */
    onDeleteAfter(startLine, endLine) {}
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