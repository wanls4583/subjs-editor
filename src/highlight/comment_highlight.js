import Util from './util.js';
import { TokenLink, TokenNode } from './token_link.js';
import TaskLink from './task_link.js';
import CONST from '../common/const_var.js';

class CommentHighLight {
	constructor(editor, rules){
		var self = this;
		this.rules = rules;
		this.editor = editor;
		this.taskList = new TaskLink(1000, 100, function(line){
            self.updateLine(line);
        }); //高亮待处理队列
        this.tokenLists = []; //多行匹配符号记录
        for (var i = 0; i < this.rules.length; i++) {
            this.tokenLists.push(new TokenLink(1000));
        }
	}
	updateLine(line) {
        this.highlight(line);
    }
    //多行代码高亮
   	highlight(startLine) {
        var self = this,
            nodes = [];
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

        //符号配对
        function _matchToken() {
            for (var i = 0; i < nodes.length; i++) {
                var tokenNode = nodes[i];
                if (tokenNode.type == CONST.PAIR_PRE_TYPE) { //开始符
                    _findSuffixToken(tokenNode);
                } else {
                    _findPreToken(tokenNode);
                }
            }

            function _findSuffixToken(tokenNode) {
                var next = tokenNode.next;
                while (next) {
                    if (next.type == CONST.PAIR_SUFFIX_TYPE) {
                        if (!next.preToken || next.preToken.line > tokenNode.line ||
                            next.preToken.line == tokenNode.line && next.preToken.start >= tokenNode.start) {
                            //suffixToken 所在行已经渲染过一次，避免重复渲染
                            if (next.preToken && next.preToken.line == tokenNode.line && next.preToken.start == tokenNode.start) {
                                tokenNode.suffixToken = next;
                                next.preToken = tokenNode;
                            } else {
                                if (next.preToken && next.preToken.line > tokenNode.line) {
                                    self.undoToken(next.preToken);
                                }
                                tokenNode.suffixToken = next;
                                next.preToken = tokenNode;
                                self.renderToken(tokenNode);
                            }
                        }
                        return;
                    }
                    next = next.next;
                }
                //其后没有suffixToken，检查是否可形成整行修饰
                self.renderToken(tokenNode);
            }

            function _findPreToken(tokenNode) {
                var pre = tokenNode.pre;
                while (pre && pre.line > 0) {
                    if (pre.type == CONST.PAIR_SUFFIX_TYPE) {
                        if (pre.next.type == CONST.PAIR_PRE_TYPE) {
                            //preToken 所在行已经渲染过一次，避免重复渲染
                            /*
                                preToken
                                ...
                                del lines
                                ...
                                suffixToken
                             */
                            if (pre.next.suffixToken && pre.next.suffixToken.line == tokenNode.line && pre.next.suffixToken.start == tokenNode.start) {
                                pre.next.suffixToken = tokenNode;
                                tokenNode.preToken = pre.next;
                            } else {
                                self.undoToken(pre.next);
                                pre.next.suffixToken = tokenNode;
                                tokenNode.preToken = pre.next;
                                self.renderToken(pre.next);
                            }
                        }
                        break;
                    } else if (pre.pre.line == 0 && pre.type == CONST.PAIR_PRE_TYPE) {
                        //preToken 所在行已经渲染过一次，避免重复渲染
                        if (pre.suffixToken && pre.suffixToken.line == tokenNode.line && pre.suffixToken.start == tokenNode.start) {
                            pre.suffixToken = tokenNode;
                            tokenNode.preToken = pre;
                        } else {
                            self.undoToken(pre);
                            pre.suffixToken = tokenNode;
                            tokenNode.preToken = pre;
                            self.renderToken(pre);
                        }
                        break;
                    }
                    pre = pre.pre;
                }
                //如果suffxiToken后面是preToken，需要为preToken重新匹配
                if (tokenNode.next && tokenNode.next.type == CONST.PAIR_PRE_TYPE) {
                    _findSuffixToken(tokenNode.next);
                }
            }
        }
    }
    /**
     * 撤销某一行的多行匹配修饰
     * @param  {Number} line 行号
     * @return {Array}       需要重新检测的行
     */
    undoTokenLine(line) {
        var recheckLines = [];
        for (var i = 0; i < this.rules.length; i++) {
            var tokenList = this.tokenLists[i];
            var tokenNode = tokenList.find(line);
            while (tokenNode && tokenNode.line == line) {
                if (tokenNode.type == CONST.PAIR_PRE_TYPE) {
                    if (tokenNode.suffixToken) {
                        recheckLines.push(tokenNode.suffixToken.line);
                    }
                    this.undoToken(tokenNode);
                } else if (tokenNode.preToken) {
                    recheckLines.push(tokenNode.preToken.line);
                    this.undoToken(tokenNode.preToken);
                }
                recheckLines.push(tokenNode.line);
                tokenNode = tokenNode.next;
            }
        }
        return recheckLines;
    }
    /**
     * 根据preToken挂载带修饰的HTML
     * @param  {Object} preToken 匹配头
     */
    renderToken(preToken) {
        var self = this;
        var endLine = self.editor.linesContext.getLength();
        if (preToken.suffixToken) {
            endLine = preToken.suffixToken.line - 1;
            if (preToken.line == preToken.suffixToken.line) {
                self.editor.linesContext.setPriorLineDecs(preToken.line, { start: preToken.start, end: preToken.suffixToken.end, token: preToken.token });
                self.editor.linesContext.updateDom(preToken.line);
            } else {
                self.editor.linesContext.setPriorLineDecs(preToken.line, { start: preToken.start, end: self.editor.linesContext.getText(preToken.line).length - 1, token: preToken.token });
                self.editor.linesContext.updateDom(preToken.line);
                self.editor.linesContext.setPriorLineDecs(preToken.suffixToken.line, { start: 0, end: preToken.suffixToken.end, token: preToken.token });
                self.editor.linesContext.updateDom(preToken.suffixToken.line);
            }
            __addWholeLineDec();
        } else if (!self.endToken ||
            preToken.line < self.endToken.line ||
            preToken.line == self.endToken.line && preToken.start < self.endToken.start) {
            self.editor.linesContext.setPriorLineDecs(preToken.line, { start: preToken.start, end: self.editor.linesContext.getText(preToken.line).length - 1, token: preToken.token });
            self.editor.linesContext.updateDom(preToken.line);
            self.endToken = preToken;
            __addWholeLineDec();
        }
        //添加整行修饰
        function __addWholeLineDec() {
            for (var i = preToken.line + 1; i <= endLine; i++) {
                self.editor.highlighter.fold.delFoldLine(i);
                self.editor.linesContext.setWhoeLineDec(i, preToken.token);
                self.editor.linesContext.updateDom(i);
            }
        }
    }
    /**
     * 撤销preToken挂载的修饰
     * @param  {Object} preToken 匹配头
     */
    undoToken(preToken) {
        var self = this;
        var endLine = (self.endToken == preToken && self.editor.linesContext.getLength()) || -1;
        if (preToken.suffixToken) {
            endLine = preToken.suffixToken.line - 1;
            if (preToken.line == preToken.suffixToken.line) {
                self.editor.linesContext.delPriorLineDecs(preToken.line, { start: preToken.start, end: preToken.suffixToken.end });
                self.editor.linesContext.updateDom(preToken.line);
            } else {
                self.editor.linesContext.delPriorLineDecs(preToken.line, { start: preToken.start, end: self.editor.linesContext.getText(preToken.line).length - 1 });
                self.editor.linesContext.updateDom(preToken.line);
                self.editor.linesContext.delPriorLineDecs(preToken.suffixToken.line, { start: 0, end: preToken.suffixToken.end });
                self.editor.linesContext.updateDom(preToken.suffixToken.line);
            }
            __delWholeLineDec();
        } else if (self.endToken == preToken) {
            self.editor.linesContext.delPriorLineDecs(preToken.line, { start: preToken.start, end: self.editor.linesContext.getText(preToken.line).length - 1 });
            self.editor.linesContext.updateDom(preToken.line);
            self.endToken = null;
            __delWholeLineDec();
        }
        if (preToken.suffixToken) {
            preToken.suffixToken.preToken = null;
            preToken.suffixToken = null;
        }
        //删除整行修饰
        function __delWholeLineDec() {
            for (var i = preToken.line + 1; i <= endLine; i++) {
                self.editor.linesContext.setWhoeLineDec(i, '');
                self.editor.linesContext.updateDom(i);
            }
        }
    }
    //多行匹配插入前回调
    onInsertBefore(startLine, endLine) {
        var recheckLines = [],
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
                        if (!suffixFlag && head.type == CONST.PAIR_SUFFIX_TYPE) {
                            //最近的下一个 suffixToken，需要重置
                            /*
                                //preToken
                                //...
                                //startLine
                                //...
                                //suffixToken(head)
                            */
                            if (head.preToken && head.preToken.line < startLine) {
                                recheckLines = recheckLines.concat(this.undoTokenLine(head.line));
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
                    } else if (!preFlag && head.type == CONST.PAIR_PRE_TYPE && (head == this.endToken || head.suffixToken && head.suffixToken.line > startLine)) {
                        recheckLines = recheckLines.concat(this.undoTokenLine(head.line));
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
        recheckLines = recheckLines.concat(this.undoTokenLine(startLine));
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
        //同步插入
        this.taskList.insert(startLine, true);
        //设置优先处理行
        this.setPriorLine(startLine);
        if (recheckLines.length) {
            //同步插入
            this.taskList.insert(recheckLines[recheckLines.length - 1], true);
            setTimeout(function() {
                //设置优先处理行，处理顺序从后到前
                self.setPriorLine(recheckLines[recheckLines.length - 1]);
            });
        }
    }
    onInsertAfter(startLine, endLine) {
        this.taskList.process();
    }
    /**
     * 删除行之前触发[外部接口]
     * @param  {Number} startLine 行号
     */
    onDeleteBefore(startLine, endLine) {
        var recheckLines = [],
            self = this;
        if (endLine > startLine) {
            var preFlag = false,
                suffixFlag = false;
            for (var i = 0; i < this.rules.length; i++) {
                var tokenList = this.tokenLists[i];
                var head = tokenList.head.next;
                while (head) {
                    //寻找匹配区域和边界交叉的preToken，需要重置
                    if (head.type == CONST.PAIR_PRE_TYPE) {
                        /*
                            //preToken(head)
                            //...
                            //startLine
                            //...
                            //suffixToken
                        */
                        if (!preFlag && head.line < startLine && (head == this.endToken || head.suffixToken && head.suffixToken.line >= startLine)) {
                            recheckLines = recheckLines.concat(this.undoTokenLine(head.line));
                            preFlag = true;
                            /*
                                //preToken(head)
                                //...
                                //endLine
                                //...
                                //suffixToken
                            */
                        } else if (!suffixFlag && head.line <= endLine && (head == this.endToken || head.suffixToken && head.suffixToken.line > endLine)) {
                            recheckLines = recheckLines.concat(this.undoTokenLine(head.line));
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
        recheckLines = recheckLines.concat(this.undoTokenLine(startLine));
        for (var i = 0, length = recheckLines.length; i < length; i++) {
            if (recheckLines[i] > endLine) {
                recheckLines[i] -= endLine - startLine;
            }
        }
        Util.sortNum(recheckLines);
        for (var i = 0; i < recheckLines.length - 1; i++) {
            this.taskList.insert(recheckLines[i]);
        }
        //同步插入
        this.taskList.insert(startLine, true);
        //设置优先级
        this.setPriorLine(startLine);
        if (recheckLines.length) {
            //同步插入
            this.taskList.insert(recheckLines[recheckLines.length - 1], true);
            setTimeout(function() {
                //设置优先级，处理顺序从后往前
                self.setPriorLine(recheckLines[recheckLines.length - 1]);
            });
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
}

export default CommentHighLight;