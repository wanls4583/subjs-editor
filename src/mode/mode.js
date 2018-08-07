import Util from './util.js';
import {TokenLink,TokenNode} from './tokenLink.js';
import TaskLink from './taskLink.js';

////////////
// 高亮基础模板 //
////////////
class Mode {
    /**
     * @param {LinesContext} linesContext [行对应的内容]
     */
    constructor(linesContext) {
        linesContext.setDecEngine(Mode.decEngine); //设置修饰对象的处理引擎
        this.linesContext = linesContext;
        this.taskList = new TaskLink(1000, this, linesContext); //待处理队列
        this.tokenLists = [];
        for (var i = 0; i < Mode.pairRules.length; i++) {
            this.tokenLists.push(new TokenLink(1000));
        }
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
    //多行代码高亮
    tokenHighlight(startLine) {
        var self = this,
            nodes = [];

        _doMatch();
        _matchToken();

        //查找多行匹配标识
        function _doMatch() {
            for (var i = 0; i < Mode.pairRules.length; i++) {
                self.tokenLists[i].del(startLine);
            }
            __exec(true);
            __exec(false);
            //正则匹配
            function __exec(ifPre) {
                for (var regIndex = 0; regIndex < Mode.pairRules.length; regIndex++) {
                    var reg = ifPre ? Mode.pairRules[regIndex].pre : Mode.pairRules[regIndex].suffix,
                        token = Mode.pairRules[regIndex].token,
                        exclude = ifPre ? Mode.pairRules[regIndex].pre_exclude : Mode.pairRules[regIndex].suffix_exclude,
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

        //符号配对
        function _matchToken() {
            for (var i = 0; i < nodes.length; i++) {
                var tokenNode = nodes[i];
                if (tokenNode.type == 1) { //开始符
                    _findSuffixToken(tokenNode);
                } else {
                    _findPreToken(tokenNode);
                }
            }

            function _findSuffixToken(tokenNode) {
                var next = tokenNode.next;
                while (next) {
                    if (next.type == 2) {
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
                    if (pre.type == 2) {
                        if (pre.next.type == 1) {
                            //preToken 所在行已经渲染过一次，避免重复渲染
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
                    } else if (pre.pre.line == 0 && pre.type == 1) {
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
                if (tokenNode.next && tokenNode.next.type == 1) {
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
        for (var i = 0; i < Mode.pairRules.length; i++) {
            var tokenList = this.tokenLists[i];
            var tokenNode = tokenList.find(line);
            while (tokenNode && tokenNode.line == line) {
                if (tokenNode.type == 1) {
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
        var endLine = self.linesContext.getLength();
        if (preToken.suffixToken) {
            endLine = preToken.suffixToken.line - 1;
            if (preToken.line == preToken.suffixToken.line) {
                self.linesContext.setPriorLineDecs(preToken.line, { start: preToken.start, end: preToken.suffixToken.end, token: preToken.token });
                self.linesContext.updateDom(preToken.line);
            } else {
                self.linesContext.setPriorLineDecs(preToken.line, { start: preToken.start, end: self.linesContext.getText(preToken.line).length - 1, token: preToken.token });
                self.linesContext.updateDom(preToken.line);
                self.linesContext.setPriorLineDecs(preToken.suffixToken.line, { start: 0, end: preToken.suffixToken.end, token: preToken.token });
                self.linesContext.updateDom(preToken.suffixToken.line);
            }
            __addWholeLineDec();
        } else if (!self.endToken ||
            preToken.line < self.endToken.line ||
            preToken.line == self.endToken.line && preToken.start < self.endToken.start) {
            self.linesContext.setPriorLineDecs(preToken.line, { start: preToken.start, end: self.linesContext.getText(preToken.line).length - 1, token: preToken.token });
            self.linesContext.updateDom(preToken.line);
            self.endToken = preToken;
            __addWholeLineDec();
        }
        //添加整行修饰
        function __addWholeLineDec() {
            for (var i = preToken.line + 1; i <= endLine; i++) {
                self.linesContext.setWhoeLineDec(i, preToken.token);
                self.linesContext.updateDom(i);
            }
        }
    }
    /**
     * 撤销preToken挂载的修饰
     * @param  {Object} preToken 匹配头
     */
    undoToken(preToken) {
        var self = this;
        var endLine = (self.endToken == preToken && self.linesContext.getLength()) || -1;
        if (preToken.suffixToken) {
            endLine = preToken.suffixToken.line - 1;
            if (preToken.line == preToken.suffixToken.line) {
                self.linesContext.delPriorLineDecs(preToken.line, { start: preToken.start, end: preToken.suffixToken.end });
                self.linesContext.updateDom(preToken.line);
            } else {
                self.linesContext.delPriorLineDecs(preToken.line, { start: preToken.start, end: self.linesContext.getText(preToken.line).length - 1 });
                self.linesContext.updateDom(preToken.line);
                self.linesContext.delPriorLineDecs(preToken.suffixToken.line, { start: 0, end: preToken.suffixToken.end });
                self.linesContext.updateDom(preToken.suffixToken.line);
            }
            __delWholeLineDec();
        } else if (self.endToken == preToken) {
            self.linesContext.delPriorLineDecs(preToken.line, { start: preToken.start, end: self.linesContext.getText(preToken.line).length - 1 });
            self.linesContext.updateDom(preToken.line);
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
                self.linesContext.setWhoeLineDec(i, '');
                self.linesContext.updateDom(i);
            }
        }
    }
    /**
     * 当更新一行时触发
     * @param  {Number} line 行号
     */
    updateLine(line) {
        this.highlight(line);
        this.tokenHighlight(line);
    }
    /**
     * 插入新行之前触发[外部接口]
     * @param  {Number} startLine 行号
     */
    onInsertBefore(startLine, endLine) {
        var recheckLines = [startLine],
            self = this;
        if (endLine > startLine) {
            var preFlag = false,
                suffixFlag = false;
            for (var i = 0; i < Mode.pairRules.length; i++) {
                var tokenList = this.tokenLists[i];
                var head = tokenList.head.next;
                while (head) {
                    if (head.line > startLine) {
                        head.line += endLine - startLine;
                        if (!suffixFlag && head.type == 2) {
                            //最近的下一个 suffixToken
                            if (head.preToken && head.preToken.line < startLine) {
                                recheckLines = recheckLines.concat(this.undoTokenLine(head.line));
                            }
                            suffixFlag = true;
                        }
                        //最近的可能影响到 startLine 的 preToken
                    } else if (!preFlag && head.type == 1 && (head == this.endToken || head.suffixToken && head.suffixToken.line > startLine)) {
                        recheckLines = recheckLines.concat(this.undoTokenLine(head.line));
                        preFlag = true;
                    }
                    head = head.next;
                }
            }
        }
        var taskNode = this.taskList.find(startLine);
        while (taskNode && (taskNode = taskNode.next)) {
            taskNode.line += endLine - startLine;
        }
        recheckLines = recheckLines.concat(this.undoTokenLine(startLine));
        for (var i = 0,length = recheckLines.length; i < length; i++) {
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
        this.setPriorLine(startLine);
        setTimeout(function() {
            self.setPriorLine(recheckLines[recheckLines.length - 1]);
        });
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
            for (var i = 0; i < Mode.pairRules.length; i++) {
                var tokenList = this.tokenLists[i];
                var head = tokenList.head.next;
                while (head) {
                    //可能影响到区域外的行
                    if (head.type == 1) {
                        if (!preFlag && head.line < startLine && (head == this.endToken || head.suffixToken && head.suffixToken.line >= startLine)) {
                            recheckLines = recheckLines.concat(this.undoTokenLine(head.line));
                            preFlag = true;
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
        var taskNode = this.taskList.find(startLine);
        while (taskNode && (taskNode = taskList.next)) {
            if (taskNode.line > endLine) {
                taskNode.line -= endLine - startLine;
            } else if (taskNode.line > startLine) {
                this.taskList.del(taskNode);
            }
        }
        recheckLines = recheckLines.concat(this.undoTokenLine(startLine));
        for (var i = 0,length = recheckLines.length; i < length; i++) {
            if (recheckLines[i] > endLine) {
                recheckLines[i] -= endLine - startLine;
            }
        }
        Util.sortNum(recheckLines);
        for (var i = 0; i < recheckLines.length; i++) {
            this.taskList.insert(recheckLines[i]);
        }
        this.setPriorLine(startLine);
        setTimeout(function() {
            self.setPriorLine(recheckLines[recheckLines.length - 1]);
        });
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
     */
    setPriorLine(endLine) {
        this.taskList.setPriorLine(endLine);
    }
    /**
     * 修饰引擎，用来处理修饰，生成HTML字符串
     * @param  {String} content 一行内容
     * @param  {Object} lineToken 修饰对象
     * @return {String}         HTML字符串
     */
    static decEngine(content, lineToken, priorLineToken) {
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

export default Mode;