import Util from '../../common/util.js';
import { TokenLink, TokenNode } from './token_link.js';
import TaskLink from '../../common/task_link.js';
import CONST from '../../common/const.js';

class FoldHightLight {
    constructor(editor) {
        var self = this;
        this.editor = editor;
        this.rules = {
            pre: /\{/g,
            pre_exclude: [Util.excludeStrReg(/\{/)],
            suffix: /\}/g,
            suffix_exclude: [Util.excludeStrReg(/\}/)],
            token: 'fold'
        };
        this.taskList = new TaskLink(100, function(line) {
            self.updateLine(line);
        }, 'frontToBack', function() {
            self.onTaskDone();
        }); //折叠待处理队列
    }
    //折叠代码
    process(startLine) {
        var nodes = [],
            self = this;
        _doMatch();
        _matchToken();
        //查找多行匹配标识
        function _doMatch() {
            self.tokenLists.del(startLine, true);
            __exec(true);
            __exec(false);
            //正则匹配
            function __exec(ifPre) {
                var reg = ifPre ? self.rules.pre : self.rules.suffix,
                    token = self.rules.token,
                    exclude = ifPre ? self.rules.pre_exclude : self.rules.suffix_exclude,
                    str = self.editor.linesContext.getText(startLine);
                var result = Util.execReg(reg, exclude, str);
                for (var j = 0; j < result.length; j++) {
                    var obj = result[j];
                    var tokenNode = new TokenNode(startLine, obj.start, obj.end, token, ifPre ? 1 : 2);
                    //插入顺序链表
                    nodes.push(self.tokenLists.insert(tokenNode));
                }
            }
        }

        function _matchToken() {
            for (var i = 0; i < nodes.length; i++) {
                var avlNode = nodes[i];
                if (avlNode.data.type == CONST.FOLD_SUFFIX_TYPE) {
                    _findPreToken(avlNode);
                }
            }
        }

        function _findPreToken(avlNode) {
            var pre = avlNode.pre;
            var tokenNode = avlNode.data;
            var stack = [tokenNode];
            while (pre) {
                var _tokenNode = pre.data;
                if (_tokenNode.type == CONST.FOLD_PRE_TYPE) {
                    var tmp = stack.pop();
                    var recheckNode = null;
                    if (tmp == tokenNode) {
                        tokenNode.preToken = _tokenNode;
                        _tokenNode.suffixToken = tokenNode;
                        self.renderFold(_tokenNode);
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
     * 当更新一行时触发[外部接口]
     * @param  {Number} line 行号
     * @param  {String} type 更新类型
     */
    updateLine(line) {
        this.process(line);
    }
    //折叠匹配插入前回调
    onInsertBefore(startLine, endLine) {
        var tokenList = this.tokenLists;
        var head = tokenList.avl.first;
        //检测可视区域的折叠符号是否已处理完整
        while (head) {
            if (head.data.type == CONST.FOLD_PRE_TYPE && head.data.suffixToken) {
                this.editor.linesContext.setFoldPos(head.data.line, null, null);
            }
            head = head.next;
        }
    }
    /**
     * 插入新行之后触发[外部接口]
     * @param  {Number} startLine 开始行号
     * @param  {Number} endLine   结束行号
     */
    onInsertAfter(startLine, endLine) {}
    /**
     * 删除行之前触发[外部接口]
     * @param  {Number} startLine 行号
     */
    onDeleteBefore(startLine, endLine) {
        var tokenList = this.tokenLists;
        var head = tokenList.avl.first;
        //检测可视区域的折叠符号是否已处理完整
        while (head) {
            if (head.data.type == CONST.FOLD_PRE_TYPE && head.data.suffixToken) {
                this.editor.linesContext.setFoldPos(head.data.line, null, null);
            }
            head = head.next;
        }
    }
    /**
     * 删除行之后触发[外部接口]
     * @param  {Number} startLine 开始行号
     * @param  {Number} endLine   结束行号
     */
    onDeleteAfter(startLine, endLine) {}
    /**
     * 任务列表处理完成后回调
     */
    onTaskDone() {
        var self = this;
        var ifDone = true;
        this.addEndLine = this.addEndLine || this.endLine;
        var tokenList = this.tokenLists;
        var head = tokenList.avl.first;
        var maxLine = this.editor.linesContext.getLength();
        //检测可视区域的折叠符号是否已处理完整
        while (head) {
            if (head.data.type == CONST.FOLD_PRE_TYPE && !head.data.suffixToken && head.data.line <= this.endLine) {
                if (this.addEndLine - this.endLine + this.editor.maxVisualLine > CONST.MAX_FOLD_LINE || this.addEndLine == maxLine) {
                    this.addEndLine = 0;
                } else {
                    for (var i = 1; i < 100 && this.addEndLine < maxLine; i++) { //不完整，添加100行
                        this.taskList.insert(++this.addEndLine);
                    }
                    ifDone = false;
                }
                break;
            } else if (head.data.line > this.endLine) {
                break;
            }
            head = head.next;
        }
        if (!ifDone) {
            if (new Date().getTime() - this.startTime > 17) { //防止浏览器阻塞
                this.timer = setTimeout(function() {
                    self.taskList.process();
                })
            } else {
                this.taskList.process();
            }
        }
    }
    /**
     * 设置优先处理行[外部接口]
     * @param {Nunber} starLine 优先处理的首行
     * @param {Boolean} ifProcess 是否立刻处理
     */
    setPriorLine(starLine, ifProcess) {
        clearTimeout(this.timer);
        this.startTime = new Date().getTime();
        this.taskList.empty();
        this.addEndLine = 0;
        this.endLine = starLine + this.editor.maxVisualLine;
        this.endLine = this.endLine > this.editor.linesContext.getLength() ? this.editor.linesContext.getLength() : this.endLine;
        this.tokenLists = new TokenLink();
        for (var i = starLine; i <= this.endLine; i++) {
            this.taskList.insert(i);
        }
        this.taskList.process();
    }
}

export default FoldHightLight;