import Highlight from '../core/highlight.js';
import { rules, commentRules } from './rules.js';

class JsHighlight extends Highlight {
    constructor(editor, ifHideFold) {
        super(editor, rules, commentRules, ifHideFold);
        this.editor = editor;
    }
    /**
     * 高亮一行代码
     * @param  {Number}  currentLine 当前行号
     */
    highlight(currentLine) {
        super.highlight(currentLine, true);
        var self = this;
        var linesContext = this.editor.linesContext;
        if (currentLine > 0) {
            //处理换行字符串
            _matchPreString(currentLine);
        }
        this.editor.linesContext.updateDom(currentLine);

        //寻找多行字符串尾部子串
        function _findSuffixString(currentLine) {
            var lineDec = linesContext.getLineDec(currentLine);
            var text = linesContext.getText(currentLine);
            var preLineDec = linesContext.getLineDec(currentLine - 1);
            var preText = linesContext.getText(currentLine - 1);
            var token = preLineDec.length && preLineDec[preLineDec.length - 1].token;
            var symbol = '';
            if (['pre_string', 'line_string'].indexOf(token) > -1 && preText[preText.length - 1] == '\\') {
                var count = 2;
                while (token != 'pre_string') { //寻找开始符（',"）
                    preText = linesContext.getText(currentLine - count);
                    preLineDec = linesContext.getLineDec(currentLine - count);
                    token = preLineDec[preLineDec.length - 1].token;
                    count++;
                }
                symbol = preText[preLineDec[preLineDec.length - 1].start];
                var index = text.indexOf(symbol);
                var start = 0;
                var insertIndex = 0;
                token = index == -1 ? 'line_string' : 'suffix_string';
                index = index == -1 ? text.length - 1 : index;
                for (var i = 0; i < lineDec.length; i++) {
                    if (lineDec[i].start <= index && lineDec[i].token != 'indent') {
                        lineDec.splice(i, 1);
                        i--;
                    } else if (lineDec[i].token == 'indent') {
                        start = lineDec[i].end + 1;
                        insertIndex = i + 1;
                    }
                }
                lineDec.splice(insertIndex, 0, { start: start, end: index, token: token });
                self.commentProcessor.recheckLine(currentLine); //重新检测多行注释
                self.foldTimer = setTimeout(function(){ //重新检测折叠
                    clearTimeout(self.foldTimer);
                    self.foldProcessor.recheckLine();
                },100);
                _matchPreString(currentLine); //插入了line_string后，需要再检查pre_string
                self.editor.linesContext.updateDom(currentLine);
                return true;
            }
            return false;
        }

        //尾部是否符合pre_string
        function _matchPreString(currentLine) {
            var text = linesContext.getText(currentLine);
            var lineDec = linesContext.getLineDec(currentLine);
            var reg = /'[^']*$|"[^"]*$/g;
            var match = reg.exec(text);
            var dec = null;
            if (match) {
                dec = {
                    start: match.index,
                    end: match.index + match[0].length - 1,
                    token: 'pre_string'
                }
                var flag = true;
                for (var i = 0; i < lineDec.length; i++) {
                    if (lineDec[i].start <= dec.start && lineDec[i].end >= dec.start) {
                        flag = false;
                        break;
                    }
                }
                if (flag) {
                    for (var i = 0; i < lineDec.length; i++) {
                        if (lineDec[i].end >= dec.start) {
                            lineDec.splice(i, 1);
                            i--;
                        }
                    }
                    lineDec.push(dec);
                    self.commentProcessor.recheckLine(currentLine); //重新检测多行注释
                    self.foldTimer = setTimeout(function(){ //重新检测折叠
                        clearTimeout(self.foldTimer);
                        self.foldProcessor.recheckLine();
                    },100);
                    var count = 1;
                    var maxLine = linesContext.getLength();
                    while (currentLine + count <= maxLine && _findSuffixString(currentLine + count)) {
                        count++;
                    }
                }
            }
        }
    }
    /**
     * 插入新行之后触发[外部接口]
     * @param  {Number} startLine 开始行号
     * @param  {Number} endLine   结束行号
     */
    onInsertBefore(startLine, endLine) {
        this.reCheckMultiStrToken(startLine);
        super.onInsertBefore(startLine, endLine);
    }
    /**
     * 删除行之后触发[外部接口]
     * @param  {Number} startLine 开始行号
     * @param  {Number} endLine   结束行号
     */
    onDeleteBefore(startLine, endLine) {
        this.reCheckMultiStrToken(startLine);
        super.onDeleteBefore(startLine, endLine);
    }
    /**
     * 重新检测多行字符串相关的行
     * @param  {Number} line 行号
     */
    reCheckMultiStrToken(startLine) {
        var lineDec = this.editor.linesContext.getLineDec(startLine);
        var maxLine = this.editor.linesContext.getLength();
        for (var i = lineDec.length - 1; i >= 0; i--) {
            if (['line_string', 'suffix_string'].indexOf(lineDec[i].token) > -1) {
                var count = 1;
                while (startLine - count > 0) {
                    lineDec = this.editor.linesContext.getLineDec(startLine - count);
                    if (lineDec[lineDec.length - 1].token == 'pre_string') {
                        this.reCheckMultiStrToken(startLine - count);
                        break;
                    }
                    count++;
                }
                break;
            } else if (lineDec[i].token == 'pre_string') {
                var count = 1;
                var hasToken = true;
                while (hasToken && startLine + count <= maxLine) {
                    hasToken = false;
                    lineDec = this.editor.linesContext.getLineDec(startLine + count);
                    for (var i = lineDec.length - 1; i >= 0; i--) {
                        if (['line_string', 'suffix_string'].indexOf(lineDec[i].token) > -1) {
                            hasToken = true;
                            this.editor.linesContext.resetLineDec(startLine + count);
                            break;
                        }
                    }
                    count++;
                }
                break;
            }
        }
        this.editor.linesContext.resetLineDec(startLine);
    }
}

export default JsHighlight;