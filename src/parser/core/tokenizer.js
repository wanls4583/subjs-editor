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
    constructor(editor, rules) {
        this.editor = editor;
        this.rules = rules;
    }
    /**
     * 高亮一行代码
     * @param  {Number}  currentLine 当前行号
     */
    analysis(currentLine) {
        if (currentLine > this.editor.linesContext.getLength() || this.editor.linesContext.hasParsed(currentLine)) { //避免重复分析
            return;
        }
        var text = this.editor.linesContext.getText(currentLine);
        var start = 0;
        var tokens = [];
        var spaces = text.match(/^\s+/g);
        spaces = spaces && spaces[0].length || 0;
        text = text.substr(spaces);
        start += spaces;
        this.editor.linesContext.setError(currentLine, '');
        while (text.length) {
            var pass = false;
            for (var i = 0; i < this.rules.length; i++) {
                var match = this.rules[i].reg.exec(text);
                if (match) {
                    tokens.push({
                        value: this.rules[i].value || match[0],
                        type: this.rules[i].type,
                        start: start
                    });
                    text = text.substr(match[0].length);
                    start += match[0].length;
                    spaces = text.match(/^\s+/g);
                    spaces = spaces && spaces[0].length || 0;
                    text = text.substr(spaces);
                    start += spaces;
                    pass = true;
                    break;
                }
            }
            if (!pass) {
                this.editor.linesContext.setError(currentLine, 'unexpected \'' + text[0] + '\' ');
                break;
            }
        }
        this.editor.linesContext.setTokens(currentLine, tokens);
    }
}

export default Tokenizer;