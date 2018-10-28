import Parser from '../core/parser.js';
import Tokenizer from './tokenizer.js';
import CONST from '../../common/const.js';

class JsParser extends Parser {
    constructor(editor) {
        super(editor, Tokenizer);
    }
    /**
     * 语法分析
     * @param  {Number} firstLine 开始分析的首行
     */
    parse(firstLine, endLine) {
        var line = firstLine;
        var stack = []; //操作栈
        var lineDone = false;
        var preToken = null;
        var nextToken = null;
        while (line <= endLine) {
            var tokens = this.editor.lineContext.getTokens(line);
            lineDone = false;
            for (var i = 0; i < tokens.length; i++) {
                var token = tokens[i];
                nextToken = tokens[i + 1];
                switch (token) {
                    case CONST.SEMICOLON_TYPE:
                        _handleSemicolon(line);
                        break;
                    case CONST.KEYWORD_TYPE:
                        _handleKeyWord(line, token);
                        break;
                    case CONST.UNARY_OP_TYPE:
                        _handleUnaryOp(line, token);
                }
                if (lineDone) {
                    break;
                }
                preToken = token;
            }
        }
        //抛出整行界符之后的操作数和操作符
        function _handleSemicolon(line) {
            while (stack.length > 0) {
                var token = stack[stack.length - 1];
                if (token.line == line && (token.type < CONST.LEFT_PARENTHESES || token.type > CONST.RIGHT_BRACES)) {
                    stack.pop();
                } else {
                    break;
                }
            }
            lineDone = true;
        }
        //处理关键字
        function _handleKeyWord(line, token) {
            
        }
        //处理单目运算符
        function _handleUnaryOp(line, token) {
            if ((token.value == '++' || token.value == '--')) {
                if (!preToken || preToken.value == ';') {
                    if (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE) { //;++1
                        this.editor.lineContext.setError(line, 'expected identifier after \'' + token.value + '\'');
                        _handleSemicolon(line);
                    }
                } else if (preToken.type != CONST.IDENTIFIER_TYPE) { //1++
                    this.editor.lineContext.setError(line, 'bad operand \'' + preToken.value + '\'');
                    _handleSemicolon(line);
                }
            } else if (token.value == '.') {
                if (!preToken || preToken.type != CONST.IDENTIFIER_TYPE) {
                    this.editor.lineContext.setError(line, 'expected identifier before \'.\'');
                    _handleSemicolon(line);
                } else if (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE) {
                    this.editor.lineContext.setError(line, 'expected identifier after \'.\'');
                    _handleSemicolon(line);
                }
            } else {
                if (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE) {
                    this.editor.lineContext.setError(line, 'expected identifier after \'' + token.value + '\'');
                    _handleSemicolon(line);
                }
            }
        }
    }
}
export default JsParser;