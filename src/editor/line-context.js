/*
 * @Author: lisong
 * @Date: 2020-10-31 16:33:30
 * @Description: 行文本上下文
 */
import Util from '../common/util';
import Highlight from '../highlight/core/highlight';
import Fold from '../fold/core/fold';
class LineContext {
    constructor(editor, option) {
        this.editor = editor;
        this.highlighter = new Highlight(this, {
            rules: option.rules,
            pairRules: option.pairRules
        });
        this.folder = new Fold(this, {
            foldRules: option.foldRules
        });
        this.lines = [];
        this.tabSize = option.tabSize || 4;
        this.tabSpace = '';
        this.maxWidthObj = {
            line: 1,
            width: 0
        };
        this.highlighted = true;
        for (var i = 0; i < this.tabSize; i++) {
            this.tabSpace += ' ';
        }
    }
    /**
     * 插入内容
     * @param {String} text 
     * @param {Number} line 
     * @param {Number} column 
     */
    insertContent(text, line, column) {
        var arr = [];
        var lines = [];
        var lineObj = this.lines[line - 1];
        var lineText = '';
        var className = '';
        var tokenType = '';
        var cunsorPos = { //新的光标位置
            line: 1,
            column: 0
        }
        if (lineObj) {
            lineObj.width = 0;
            lineText = lineObj.text;
            this.setMaxWidth();
            className = lineObj.className;
            tokenType = lineObj.tokenType;
        }
        text = lineText.slice(0, column) + text + lineText.slice(column);
        text = text.replace(/\t/g, this.tabSpace);
        arr = text.split(/\r\n|\n/);
        arr.map((item, index) => {
            var lineObj = {
                text: item,
                rendered: false,
                html: '',
                width: 0,
                tokens: null,
                pairTokens: null,
                foldTokens: null,
                seniorTokens: null,
                className: className,
                tokenType: tokenType,
                foldTag: 0,
                foldTagToken: null
            };
            lineObj.width = Util.getStrWidth(item, this.editor.charWH.charWidth, this.editor.charWH.fullAngleCharWidth);
            if (lineObj.width > this.maxWidthObj.width) {
                this.maxWidthObj = {
                    line: line + index,
                    width: lineObj.width
                };
            }
            lines.push(lineObj);
        });
        this.lines.length && this.highlighter.onInsertContentBefore(line);
        this.lines.length && this.folder.onInsertContentBefore(line);
        this.lines = this.lines.slice(0, line - 1).concat(lines).concat(this.lines.slice(line));
        this.highlighter.onInsertContentAfter(line, lines.length - 1);
        this.folder.onInsertContentAfter(line, lines.length - 1);
        cunsorPos.line = line + arr.length - 1;
        cunsorPos.column = arr[arr.length - 1].length - (lineText.length - column);
        return cunsorPos;
    }
    /**
     * 删除内容
     * @param {Object} start {line, column}
     * @param {Object} end {line, column} 
     */
    deleteContent(start, end) {
        if (start.line > end.line || start.line == end.line && start.column > end.column) {
            var temp = start;
            start = end;
            end = temp;
        }
        this.highlighter.onDeleteContentBefore(start.line, end.line - start.line);
        this.folder.onDeleteContentBefore(start.line, end.line - start.line);
        this.lines[start.line - 1].html = '';
        this.lines[start.line - 1].text = this.getText(start.line, 0, start.column) + this.getText(end.line, end.column);
        if (start.line != end.line) {
            this.lines = this.lines.slice(0, start.line).concat(this.lines.slice(end.line));
        }
        this.highlighter.onDeleteContentAfter(start.line, end.line - start.line);
        this.folder.onDeleteContentAfter(start.line, end.line - start.line);
        this.setMaxWidth();
        this.setRenderTag(start.line, false);
    }
    /**
     * 多行匹配配对成功
     * @param {Object} pairToken 
     */
    matchedPairToken(pairToken) {
        if (pairToken.matchedNode) {
            var startLine = pairToken.line;
            var endLine = pairToken.matchedNode.line;
            if (startLine > endLine) {
                var temp = startLine;
                startLine = endLine;
                endLine = temp;
            }
            for (var i = startLine + 1; i < endLine; i++) {
                this.setClassName(i, pairToken.className);
                this.setTokenType(i, pairToken.type);
                this.setRenderTag(i, false);
            }
            this.setRenderTag(startLine, false);
            this.setRenderTag(endLine, false);
        } else if (pairToken.matchend) {
            var length = this.lines.length;
            for (var i = pairToken.line + 1; i <= length; i++) {
                this.setClassName(i, pairToken.className);
                this.setTokenType(i, pairToken.type);
                this.setRenderTag(i, false);
            }
            this.setRenderTag(pairToken.line, false);
        }
    }
    /**
     * 多行匹配取消配对
     * @param {Object} pairToken 
     */
    unMatchPairToken(pairToken) {
        if (pairToken.matchedNode) {
            var startLine = pairToken.line;
            var endLine = pairToken.matchedNode.line;
            if (startLine > endLine) {
                var temp = startLine;
                startLine = endLine;
                endLine = temp;
            }
            for (var i = startLine + 1; i < endLine; i++) {
                this.setClassName(i, '');
                this.setTokenType(i, '');
                this.setRenderTag(i, false);
            }
            this.setRenderTag(startLine, false);
            this.setRenderTag(endLine, false);
        } else if (pairToken.matchend) {
            var length = this.lines.length;
            for (var i = pairToken.line + 1; i <= length; i++) {
                this.setClassName(i, '');
                this.setTokenType(i, '');
                this.setRenderTag(i, false);
            }
            this.setRenderTag(pairToken.line, false);
        }
    }
    /**
     * 折叠配对成功
     * @param {Object} foldToken 
     */
    matchFoldToken(foldToken) {
        foldToken = foldToken.role == Util.constData.PAIR_START ? foldToken : foldToken.matchedNode;
        if (foldToken.matchedNode.line - foldToken.line > 0) {
            this.setFoldTag(foldToken.line, 1);
            this.setFoldTagToken(foldToken.line, foldToken);
        }
    }
    /**
     * 取消折叠配对
     * @param {Object} foldToken 
     */
    unMatchFoldToken(foldToken) {
        foldToken = foldToken.role == Util.constData.PAIR_START ? foldToken : foldToken.matchedNode;
        this.setFoldTag(foldToken.line, 0);
        this.setFoldTagToken(foldToken.line, null);
    }
    //调editor渲染
    render() {
        this.editor.render();
    }
    //调editor渲染折叠标记
    renderNum() {
        this.editor.renderNum();
    }
    /**
     * 设置整行修饰
     * @param {Number} line 
     * @param {String} className 
     */
    setClassName(line, className) {
        var lineObj = this.lines[line - 1];
        lineObj.className = className;
    }
    /**
     * 设置整行修饰的类型
     * @param {Number} line 
     * @param {String} tokenType 
     */
    setTokenType(line, tokenType) {
        var lineObj = this.lines[line - 1];
        lineObj.tokenType = tokenType;
    }
    /**
     * 设置渲染标记
     * @param {Number} line 
     * @param {Boolean} rendered 
     */
    setRenderTag(line, rendered) {
        if (line > 0 && line <= this.lines.length) {
            this.lines[line - 1].rendered = rendered;
            this.lines[line - 1].html = '';
        }
    }
    /**
     * 设置折叠标记
     * @param {Number} line 
     * @param {Boolean} foldTag [1:打开,-1:折叠]
     */
    setFoldTag(line, foldTag) {
        if (line > 0 && line <= this.lines.length) {
            this.lines[line - 1].foldTag = foldTag;
        }
    }
    /**
     * 设置有效折叠标记的token
     * @param {Number} line 
     * @param {Object} foldTagToken 
     */
    setFoldTagToken(line, foldTagToken) {
        if (line > 0 && line <= this.lines.length) {
            this.lines[line - 1].foldTagToken = foldTagToken;
        }
    }
    //设置最大行的宽度
    setMaxWidth() {
        var max = 0;
        this.maxWidthObj = {
            line: 1,
            width: 0
        };
        for (var i = 0; i < this.lines.length; i++) {
            if (this.lines[i].width > max) {
                this.maxWidthObj.line = i + 1;
                this.maxWidthObj.width = this.lines[i].width;
                max = this.lines[i].width;
            }
        }
    }
    /**
     * 设置匹配的token
     * @param {Number} line 
     * @param {Array} tokens 
     */
    setTokens(line, tokens) {
        this.lines[line - 1].tokens = tokens;
    }
    /**
     * 设置多行匹配的token
     * @param {Number} line 
     * @param {Array} pairTokens 
     */
    setPairTokens(line, pairTokens) {
        this.lines[line - 1].pairTokens = pairTokens;
    }
    /**
     * 设置多行匹配的token
     * @param {Number} line 
     * @param {Array} seniorTokens 
     */
    setSeniorTokens(line, seniorTokens) {
        this.lines[line - 1].seniorTokens = seniorTokens;
    }
    /**
     * 设置折叠匹配的token
     * @param {Number} line 
     * @param {Array} foldTokens 
     */
    setFoldTokens(line, foldTokens) {
        this.lines[line - 1].foldTokens = foldTokens;
    }
    /**
     * 设置高亮完成标记
     * @param {Boolean} done 
     */
    setHighlighted(done) {
        this.highlighted = done;
    }
    //获取最大宽度
    getMaxWidth() {
        return this.maxWidthObj;
    }
    /**
     * 获取行对象
     * @param {Number} line 
     */
    getLine(line) {
        return this.lines[line - 1];
    }
    /**
     * 获取行对应的文本
     * @param {Number} line 
     * @param {Number} index 
     * @param {Number} column 
     * @return {String}
     */
    getText(line, index, column) {
        var lineObj = this.lines[line - 1];
        index = index || 0;
        if (typeof column == 'undefined') {
            column = column || Number.MAX_VALUE;
        }
        if (lineObj) {
            return lineObj.text.slice(index, column);
        }
        return '';
    }
    /**
     * 获取范围内的文本
     * @param {Object} start {line, column}
     * @param {Object} end {line, column} 
     * @return {String}
     */
    getRangeText(start, end) {
        if (start.line > end.line) {
            var temp = start;
            start = end;
            end = temp;
        }
        var text = '';
        if (start.line != end.line) {
            text += this.getText(start.line, start.column);
            if (start.line + 1 < end.line) {
                var textArr = this.lines.slice(start.line, end.line - 1).map((item) => {
                    return item.text
                });
                //join的性能高于字符串累加
                text += '\n' + textArr.join('\n');
            }
            text += '\n' + this.getText(end.line, 0, end.column);
        } else {
            text += this.getText(start.line, start.column, end.column);
        }
        return text;
    }
    /**
     * 获取行对应的HTML字符串
     * @param {Number}} line 
     */
    getHTML(line) {
        var lineObj = this.getLine(line);
        if (lineObj) {
            if (!lineObj.html) {
                var html = lineObj.text;
                var tagLeft = Util.getUUID(); // <
                var tagRight = Util.getUUID(); // >
                var sufTag = `${tagLeft}/span${tagRight}`;
                var className = lineObj.className;
                if (className) {
                    html = `${tagLeft}span class="${className}"${tagRight}${html}${sufTag}`;
                } else {
                    var tokens = this.highlighter.getLineTokens(line);
                    this.setTokens(line, tokens);
                    if (lineObj.pairTokens && lineObj.pairTokens.length) {
                        tokens = this.highlighter.mergeToken(tokens, lineObj.pairTokens);
                    }
                    tokens = Util.copyObj(tokens);
                    for (var i = 0; i < tokens.length; i++) {
                        var token = tokens[i];
                        var preTag = `${tagLeft}span class="${token.className}"${tagRight}`;
                        html = html.slice(0, token.start) + preTag + html.slice(token.start, token.end) + sufTag + html.slice(token.end);
                        tokens.slice(i + 1).map((item) => {
                            if (item.start >= token.end) {
                                item.start += preTag.length + sufTag.length;
                            } else {
                                item.start += preTag.length;
                            }
                            if (item.end >= token.end) {
                                item.end += preTag.length + sufTag.length;
                            } else {
                                item.end += preTag.length;
                            }
                        });
                    }
                }
                html = Util.htmlTrans(html); //转换html字符实体
                html = html.replace(new RegExp(tagLeft, 'g'), '<').replace(new RegExp(tagRight, 'g'), '>');
                lineObj.html = html;
            }
            return lineObj.html;
        }
        return '';
    }
    getWholeClassName(line) {
        return this.lines[line - 1].className;
    }
    //获取行的数
    getLength() {
        return this.lines.length;
    }
    getHighlighted() {
        return this.highlighted;
    }
}

export default LineContext;