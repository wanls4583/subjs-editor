import TaskLink from '../../common/task_link.js';
////////////
// 词法分析 //
////////////
class Tokenizer {
    /**
     * @param {Editor}    editor       编辑器对象
     * @param {Object}    rules        分词规则
     * @param {Function}  onTaskDone   分析完成回调
     */
    constructor(editor, rules, onTaskDone) {
        var self = this;
        this.editor = editor;
        this.rules = rules;
        this.taskList = new TaskLink(100, function(line) {
            if (!self.editor.linesContext.hasParsed(line)) { //避免重复分析
                self.analysis(line);
            }
        },null,function(){
            onTaskDone(self.startParseline);
        });
    }
    /**
     * 高亮一行代码
     * @param  {Number}  currentLine 当前行号
     */
    analysis(currentLine) {
        var text = this.editor.linesContext.getText(currentLine).replace(/^\s+/g, '');
        var start = 0;
        var tokens = [];
        while (text.length) {
            var pass = false;
            for (var i = 0; i < this.rules.length; i++) {
                var match = this.rules[i].reg.exec(text.substr(start));
                if (match) {
                    tokens.push({
                        value: this.rules[i].value || match[0],
                        type: this.rules[i].type
                    });
                    text = text.substr(match[0].length).replace(/^\s+/g, '');
                    pass = true;
                    break;
                }
            }
            if(!pass) {
                this.editor.linesContext.setError(currentLine, 'unexpected\''+text[0]+'\'');
                break;
            }
        }
        this.editor.linesContext.setTokens(currentLine, tokens);
    }
    /**
     * 插入新行之前触发[外部接口]
     * @param  {Number} startLine 行号
     */
    onInsertBefore(startLine, endLine) {}
    /**
     * 插入新行之后触发[外部接口]
     * @param  {Number} startLine 开始行号
     * @param  {Number} endLine   结束行号
     */
    onInsertAfter(startLine, endLine) {
        for (var i = startLine; i <= endLine; i++) {
            this.editor.linesContext.resetTokens(i);
        }
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
    onDeleteAfter(startLine, endLine) {
        this.editor.linesContext.resetTokens(startLine);
    }
    /**
     * 设置优先处理行[外部接口]
     * @param {Nunber}  line         优先处理的首行或末行
     * @param {Boolean} delayProcess 是否延迟执行任务
     */
    setPriorLine(line, delayProcess) {
        var endLine = line;
        var firstLine = line - this.editor.maxVisualLine - 1000;
        firstLine = firstLine < 0 ? 1 : firstLine;
        this.taskList.empty();
        for (var i = firstLine; i <= endLine; i++) {
            this.taskList.insert(i);
        }
        !delayProcess && this.taskList.process();
    }
}

export default Tokenizer;