import Util from './util.js';
import { TokenLink, TokenNode } from './token_link_v1.js';
import TaskLink from './task_link.js';
import CONST from '../common/const_var.js';

class FoldHightLight {
    constructor(editor, rules) {
        var self = this;
        this.rules = rules;
        this.editor = editor;
        this.tokenLists = []; //折叠符号记录
        this.taskList = new TaskLink(100, function(line) {
            if (self.checkConflict(line)) {
                self.updateLine(line);
            }
        }, 'frontToBack'); //折叠待处理队列
        for (var i = 0; i < this.rules.length; i++) {
            this.tokenLists.push(new TokenLink());
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
                        if (self.checkConflict(tokenNode)) {
                            //插入顺序链表
                            nodes.push(self.tokenLists[regIndex].insert(tokenNode));
                        }
                    }
                }
            }
        }

        function _matchToken() {
            for (var i = 0; i < nodes.length; i++) {
                var avlNode = nodes[i];
                if (avlNode.data.type == CONST.FOLD_PRE_TYPE) {
                    _findSuffixToken(avlNode);
                } else {
                    _findPreToken(avlNode);
                }
            }
        }

        function _findSuffixToken(avlNode) {
            var next = avlNode.next;
            var tokenNode = avlNode.data;
            var stack = [tokenNode];
            while (next) {
                var _tokenNode = next.data;
                if (_tokenNode.type == CONST.FOLD_SUFFIX_TYPE) {
                    if (stack[stack.length - 1].type == CONST.FOLD_PRE_TYPE) {
                        var tmp = stack.pop();
                        var recheckNode = null;
                        if (tmp == tokenNode) {
                            if (tmp.suffixToken) {
                                self.undoFold(tmp);
                            }
                            if (_tokenNode.preToken) {
                                if (_tokenNode.preToken.line != tokenNode.line) {
                                    recheckNode = _tokenNode.preToken;
                                }
                                self.undoFold(_tokenNode.preToken);
                            }
                        }
                        tmp.suffixToken = _tokenNode;
                        _tokenNode.preToken = tmp;
                        self.renderFold(tmp);
                        if (tmp == tokenNode) {
                            recheckNode && _findSuffixToken(recheckNode);
                            return;
                        }
                    } else {
                        return;
                    }
                } else {
                    stack.push(_tokenNode);
                }
                next = next.next;
            }
        }

        function _findPreToken(avlNode) {
            var pre = avlNode.pre;
            var tokenNode = avlNode.data;
            var stack = [tokenNode];
            while (pre) {
                var _tokenNode = pre.data;
                if (_tokenNode.type == CONST.FOLD_PRE_TYPE) {
                    if (stack[stack.length - 1].type == CONST.FOLD_SUFFIX_TYPE) {
                        var tmp = stack.pop();
                        var recheckNode = null;
                        if (tmp == tokenNode) {
                            if (tmp.preToken) {
                                self.undoFold(tmp.preToken);
                            }
                            if (_tokenNode.suffixToken) {
                                if (_tokenNode.suffixToken.line != tokenNode.line) {
                                    recheckNode = _tokenNode.suffixToken;
                                }
                                self.undoFold(_tokenNode);
                            }
                        }
                        tmp.preToken = _tokenNode;
                        _tokenNode.suffixToken = tmp;
                        self.renderFold(_tokenNode);
                        if (tmp == tokenNode) {
                            recheckNode && _findPreToken(recheckNode);
                            return;
                        }
                    } else {
                        return;
                    }
                } else {
                    stack.push(_tokenNode);
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
            var avlNode = tokenList.find(line);
            while (avlNode && avlNode.data.line == line) {
                var tokenNode = avlNode.data;
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
                avlNode = avlNode.next;
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
                var head = tokenList.avl.first;
                while (head) {
                    var tokenNode = head.data;
                    //重置匹配区域和新增区域有交叉的行
                    if (tokenNode.line > startLine) {
                        head.key.line += endLine - startLine;
                        tokenNode.line += endLine - startLine;
                        if (tokenNode.type == CONST.FOLD_SUFFIX_TYPE) {
                            if (tokenNode.preToken && tokenNode.preToken.line < startLine) {
                                recheckLines = recheckLines.concat(this.undoFoldLine(tokenNode.line));
                            }
                        }
                    } else if (tokenNode.type == CONST.FOLD_PRE_TYPE && tokenNode.suffixToken && tokenNode.suffixToken.line > startLine) {
                        recheckLines = recheckLines.concat(this.undoFoldLine(tokenNode.line));
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
    } 
    /**
     * 插入新行之后触发[外部接口]
     * @param  {Number} startLine 开始行号
     * @param  {Number} endLine   结束行号
     */
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
            for (var i = 0; i < this.rules.length; i++) {
                var tokenList = this.tokenLists[i];
                var head = tokenList.avl.first;
                while (head) {
                    var tokenNode = head.data;
                    //重置匹配区域和删除区域有交叉的行
                    if (tokenNode.type == CONST.FOLD_PRE_TYPE) {
                        if (tokenNode.line < startLine && tokenNode.suffixToken && tokenNode.suffixToken.line >= startLine) {
                            recheckLines = recheckLines.concat(this.undoFoldLine(tokenNode.line));
                        } else if (tokenNode.line <= endLine && tokenNode.suffixToken && tokenNode.suffixToken.line > endLine) {
                            recheckLines = recheckLines.concat(this.undoFoldLine(tokenNode.line));
                        }
                    }
                    if (tokenNode.line > endLine) {
                        head.key.line -= endLine - startLine;
                        tokenNode.line -= endLine - startLine;
                    } else if (tokenNode.line > startLine) {
                        var headPre = head.pre;
                        tokenList.del(tokenNode);
                        if (headPre) {
                            head = headPre.next;
                        } else {
                            head = tokenList.avl.first;
                        }
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
     * 设置优先处理行[外部接口]
     * @param {Nunber} endLine 优先处理的末行
     * @param {Boolean} ifProcess 是否立刻处理
     */
    setPriorLine(endLine, ifProcess) {
        this.taskList.setPriorLine(endLine, ifProcess);
    }
    /**
     * 重新检测行[对外接口]
     * @param  {Number} line 行号
     */
    recheckLine(line) {
        var self = this;
        if (!this.taskList.find(line)) {
            this.taskList.insert(line);
            this.taskList.setPriorLine(line);
        }
        setTimeout(function() {
            self.taskList.process();
        }, 0);
    }
    /**
     * 检测折叠标记是否合法（可能处于注释中）
     * @param  {Number} line  行号
     * @return {Boolean}      是否合法
     */
    checkConflict(line) {
        var pass = true;
        if (typeof line == 'number') { //该行是否为整行注释
            pass = !this.editor.linesContext.getWholeLineDec(line);
        } else {
            var tokenNode = line;
            pass = !this.editor.linesContext.getWholeLineDec(tokenNode.line); //该行是否为整行注释
            if (pass) {
                var priLineDecs = this.editor.linesContext.getPriorLineDecs(tokenNode.line);
                //和多行注释的首尾行是否有交叉
                for (var i = 0; i < priLineDecs.length; i++) {
                    var lineDec = priLineDecs[i];
                    if (lineDec.token == 'pair_comment' && !(lineDec.start > tokenNode.end || lineDec.end < tokenNode.start)) {
                        pass = false;
                        break;
                    }
                }
            }
        }
        return pass;
    }
}

export default FoldHightLight;