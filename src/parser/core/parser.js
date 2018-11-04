class Parser {
    /**
     * @param  {Editor}    editor    编辑器
     * @param  {Function}  Tokenizer 词法分析器
     * @param  {Array}     rules     词法规则
     */
    constructor(editor, Tokenizer) {
        var self = this;
        this.editor = editor;
        this.tokenizer = new Tokenizer(editor);
    }
    /**
     * 语法分析
     * @param  {Number} firstLine 开始分析的首行
     */
    parse(firstLine) {}
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
        this.stackHistory = this.stackHistory.slice(0, Math.floor(startLine / 100));
    }
    /**
     * 设置优先处理行[外部接口]
     * @param {Nunber}  line         优先处理的首行或末行
     * @param {Boolean} delayProcess 是否延迟执行任务
     */
    setPriorLine(line, delayProcess) {
        !delayProcess && this.parse(line);
    }
}

export default Parser;