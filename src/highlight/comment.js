import Util from './util.js';
import { TokenLink, TokenNode } from './token_link.js';
import TaskLink from './task_link.js';
import CONST from '../common/const_var.js';

class CommentHighLight {
    constructor(editor, rules) {
        var self = this;
        this.rules = rules;
        this.editor = editor;
        this.taskList = new TaskLink(100, function(line) {
            self.updateLine(line);
        }); //高亮待处理队列
        this.tokenLists = []; //多行匹配符号记录
        for (var i = 0; i < this.rules.length; i++) {
            this.tokenLists.push(new TokenLink(1000));
        }
        window.tokenLists = this.tokenLists;
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
                self.tokenLists[i].del(startLine, true);
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
                        nodes.push(self.tokenLists[regIndex].insert(tokenNode));
                    }
                }
            }
        }

        //符号配对
        function _matchToken() {
            for (var i = 0; i < nodes.length; i++) {
                var avlNode = nodes[i];
                if (avlNode.data.type == CONST.PAIR_PRE_TYPE) { //开始符
                    _findSuffixToken(avlNode);
                } else {
                    _findPreToken(avlNode);
                }
            }

            function _findSuffixToken(avlNode) {
                var tokenNode = avlNode.data;
                var next = avlNode.next;
                while (next && next.data.type == CONST.PAIR_PRE_TYPE) { //找到其后第一个 pre_tag
                    avlNode = next;
                    next = next.next;
                }
                if (next && next.data.type == CONST.PAIR_SUFFIX_TYPE) {
                    var _tokenNode = next.data;
                    if (_tokenNode.preToken) {
                        var preToken = _tokenNode.preToken;
                        self.undoToken(_tokenNode.preToken);
                        _findSuffixToken(self.tokenLists[_tokenNode.regIndex].find(preToken));
                    }
                    _tokenNode.preToken = tokenNode;
                    tokenNode.suffixToken = _tokenNode;
                }
                self.renderToken(tokenNode);
            }

            function _findPreToken(avlNode) {
                var tokenNode = avlNode.data;
                var pre = avlNode.pre;
                while (pre && pre.data.type == CONST.PAIR_PRE_TYPE) { //找到最前面的一个 pre_tag
                    avlNode = pre;
                    pre = pre.pre;
                }
                if (avlNode.data.type == CONST.PAIR_PRE_TYPE) {
                    var _tokenNode = avlNode.data;
                    var suffixToken = _tokenNode.suffixToken;
                    self.undoToken(_tokenNode); //_tokenNode可能是endPreToken
                    suffixToken && _findPreToken(self.tokenLists[_tokenNode.regIndex].find(suffixToken));
                    _tokenNode.suffixToken = tokenNode;
                    tokenNode.preToken = _tokenNode;
                    self.renderToken(_tokenNode);
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
            var avlNode = tokenList.find(line);
            while (avlNode && avlNode.data.line == line) {
                var tokenNode = avlNode.data;
                if (tokenNode.type == CONST.PAIR_PRE_TYPE) {
                    if (tokenNode.suffixToken) {
                        recheckLines.push(tokenNode.suffixToken.line);
                    }
                    this.undoToken(tokenNode);
                } else if (tokenNode.preToken) {
                    recheckLines.push(tokenNode.preToken.line);
                    this.undoToken(tokenNode.preToken);
                }
                avlNode = avlNode.next;
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
        } else if (!self.endPreToken ||
            preToken.line < self.endPreToken.line ||
            preToken.line == self.endPreToken.line && preToken.start < self.endPreToken.start) {
            self.editor.linesContext.setPriorLineDecs(preToken.line, { start: preToken.start, end: self.editor.linesContext.getText(preToken.line).length - 1, token: preToken.token });
            self.editor.linesContext.updateDom(preToken.line);
            self.endPreToken = preToken;
            __addWholeLineDec();
        }
        //添加整行修饰
        function __addWholeLineDec() {
            for (var i = preToken.line + 1; i <= endLine; i++) {
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
        var endLine = (self.endPreToken == preToken && self.editor.linesContext.getLength()) || -1;
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
        } else if (self.endPreToken == preToken) {
            self.editor.linesContext.delPriorLineDecs(preToken.line, { start: preToken.start, end: self.editor.linesContext.getText(preToken.line).length - 1 });
            self.editor.linesContext.updateDom(preToken.line);
            self.endPreToken = null;
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
        var recheckLines = [startLine],
            self = this;
        if (endLine > startLine) {
            var preFlag = false,
                suffixFlag = false;
            for (var i = 0; i < this.rules.length; i++) {
                var tokenList = this.tokenLists[i];
                var head = tokenList.find(startLine);
                var count = 1;
                var len = this.editor.linesContext.getLength();
                //寻找startLine行后的第一个token节点
                while (!head && count < 10000 && startLine + count < len) {
                    head = tokenList.find(startLine + count);
                    count++;
                }
                if (!head) {
                    head = tokenList.avl.first;
                }
                while (head) {
                    var tokenNode = head.data;
                    //寻找匹配区域和startLine有交叉的preToken，需要重置
                    if (tokenNode.type == CONST.PAIR_SUFFIX_TYPE && tokenNode.preToken && tokenNode.preToken.line < startLine) {
                        recheckLines = recheckLines.concat(this.undoTokenLine(tokenNode.preToken.line));
                    } else if (tokenNode.line > startLine) {
                        head.key.line += endLine - startLine;
                        tokenNode.line += endLine - startLine;
                    }
                    head = head.next;
                }
            }
        }
        this.taskList.eachTask(function(avlNode, index) {
            avlNode.key += endLine - startLine;
            avlNode.data += endLine - startLine;
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
        for (var i = 0; i < recheckLines.length; i++) {
            this.taskList.insert(recheckLines[i]);
        }
    }
    onInsertAfter(startLine, endLine) {
        //先处理当前行
        this.updateLine(startLine);
        this.taskList.del(startLine);
        this.taskList.process();
    }
    /**
     * 删除行之前触发[外部接口]
     * @param  {Number} startLine 行号
     */
    onDeleteBefore(startLine, endLine) {
        var recheckLines = [startLine],
            self = this;
        //删除任务列表中还未完成的行
        for (var i = startLine + 1; i <= endLine; i++) {
            this.taskList.del(i);
        }
        if (endLine > startLine) {
            var preFlag = false,
                suffixFlag = false;
            for (var i = 0; i < this.rules.length; i++) {
                var tokenList = this.tokenLists[i];
                var head = tokenList.find(startLine);
                var count = 1;
                var len = this.editor.linesContext.getLength();
                //寻找startLine行后的第一个token节点
                while (!head && count < 10000 && startLine + count < len) {
                    head = tokenList.find(startLine + count);
                    count++;
                }
                if (!head) {
                    head = tokenList.avl.first;
                }
                while (head) {
                    var tokenNode = head.data;
                    //寻找匹配区域和边界交叉的preToken，需要重置
                    if (tokenNode.type == CONST.PAIR_PRE_TYPE && tokenNode.line <= endLine && (tokenNode == this.endPreToken || tokenNode.suffixToken && tokenNode.suffixToken.line > endLine)) {
                        recheckLines = recheckLines.concat(this.undoTokenLine(tokenNode.line));
                    } else if (tokenNode.type == CONST.PAIR_SUFFIX_TYPE && tokenNode.line > startLine && tokenNode.preToken && tokenNode.preToken.line < startLine) {
                        recheckLines = recheckLines.concat(this.undoTokenLine(tokenNode.preToken.line));
                    }
                    if (tokenNode.line > endLine) {
                        head.key.line -= endLine - startLine; //avlNode的key也要变化
                        tokenNode.line -= endLine - startLine;
                    } else if (tokenNode.line > startLine) {
                        var headPre = head.pre;
                        tokenList.del(tokenNode);
                        //二叉树的删除操作只会在叶子节点删除节点，当前节点引用可能变成了下一个节点的数据
                        if (headPre) {
                            head = headPre.next;
                        } else {
                            head = tokenList.avl.first;
                        }
                        continue;
                    }
                    head = head.next;
                }
            }
        }
        this.taskList.eachTask(function(avlNode) {
            avlNode.key -= endLine - startLine;
            avlNode.data -= endLine - startLine;
        }, startLine);
        recheckLines = recheckLines.concat(this.undoTokenLine(startLine));
        for (var i = 0, length = recheckLines.length; i < length; i++) {
            if (recheckLines[i] > endLine) {
                recheckLines[i] -= endLine - startLine;
            }
        }
        Util.sortNum(recheckLines);
        for (var i = 0; i < recheckLines.length; i++) {
            this.taskList.insert(recheckLines[i]);
        }
    }
    /**
     * 删除行之后触发[外部接口]
     * @param  {Number} startLine 开始行号
     * @param  {Number} endLine   结束行号
     */
    onDeleteAfter(startLine, endLine) {
        //先处理当前行
        this.updateLine(startLine);
        this.taskList.del(startLine);
        this.taskList.process();
    }
    /**
     * 设置优先处理行[外部接口，每次更新都会调用]
     * @param {Nunber} endLine 优先处理的末行
     * @param {Boolean} ifProcess 是否立刻处理
     */
    setPriorLine(endLine, ifProcess) {
        this.taskList.setPriorLine(endLine, ifProcess);
    }
}

export default CommentHighLight;