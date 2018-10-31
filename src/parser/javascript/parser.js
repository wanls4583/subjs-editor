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
        var self = this;
        var line = firstLine;
        var stack = []; //操作栈
        var lineError = false;
        var startObjTokens = [];
        var startStrToken = null;
        var startCommentToken = null;
        while (line <= endLine) {
            var tokens = this.editor.linesContext.getTokens(line);
            lineError = false;
            for (var i = 0; i < tokens.length; i++) {
                var token = tokens[i];
                self.editor.linesContext.setError(line, '');
                switch (token.type) {
                    case CONST.SEMICOLON_TYPE:
                        _handleSemicolon(line, token);
                        break;
                    case CONST.KEYWORD_TYPE:
                        _handleKeyWord(line, token);
                        break;
                    case CONST.UNARY_OP_TYPE:
                        _handleUnaryOp(line, token);
                        break;
                    case CONST.BINARY_OP_TYPE:
                        _handBinaryOp(line, token);
                        break;
                    case CONST.TERNARY_OP_TYPE:
                        _handTerNaryOp(line, token);
                        break;
                    case CONST.LEFT_PARENTHESES:
                    case CONST.RIGHT_PARENTHESES:
                        _handleParentheses(line, token);
                        break;
                    case CONST.LEFT_BRACES:
                    case CONST.RIGHT_BRACES:
                        _handleBraces(line, token);
                        break;
                    case CONST.LEFT_SQUARE_BRACKETS:
                    case CONST.RIGHT_SQUARE_BRACKETS:
                        _handleBracekts(line, token);
                        break;
                    case CONST.IDENTIFIER_TYPE:
                    case CONST.CONSTANT_TYPE:
                        _handleIndentifier(line, token);
                        break;
                    case CONST.SINGLE_QUOTATION_TYPE:
                    case CONST.DOUBLE_QUOTATION_TYPE:
                        _handleString(line, token);
                        break;
                    case CONST.ESCAPE_TYPE:
                        _handleEscape(line, token);
                        break;
                    case CONST.START_COMMENT_TYPE:
                    case CONST.END_COMMENT_TYPE:
                        _handleComment(line, token);
                        break;

                }
                if (lineError) {
                    break;
                }
            }
            _handleEnd(line, token);
            line++;
        }
        //获取前一个token
        function _gerPreToken(distance) {
            if(typeof distance == 'number') {
                return stack[stack.length - distance];
            } else {
                var token = distance;
                var line = token.line;
                var tokens = self.editor.linesContext.getTokens(line);
                var index = tokens.indexOf(token.originToken || token) - 1;
                while (line >= firstLine) {
                    if (index >= 0) {
                        return tokens[index];
                    } else {
                        tokens = self.editor.linesContext.getTokens(--line);
                        index = tokens.length - 1;
                    }
                }
                return null;
            }
        }
        //获取下一个token
        function _getNextToken(token) {
            var line = token.line;
            var tokens = self.editor.linesContext.getTokens(line);
            var index = tokens.indexOf(token.originToken || token) + 1;
            while (line <= endLine) {
                if (index < tokens.length) {
                    return tokens[index];
                } else {
                    tokens = self.editor.linesContext.getTokens(++line);
                    index = 0;
                }
            }
            return null;
        }
        //清空一行
        function _empty(line) {
            while (stack.length) {
                if (stack[stack.length - 1].line == line) {
                    stack.pop();
                } else {
                    break;
                }
            }
        }
        //处理错误行
        function _handleError(line, error) {
            lineError = true;
            self.editor.linesContext.setError(line, error);
            _empty(line);
        }

        function _handleEnd(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            while (stack.length > 0) { //清空表达式
                var token = stack[stack.length - 1];
                if (token.line == line && (token.type < CONST.LEFT_PARENTHESES || token.type > CONST.RIGHT_BRACES)) {
                    stack.pop();
                } else {
                    break;
                }
            }
        }
        //抛出整行界符之后的操作数和操作符
        function _handleSemicolon(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _gerPreToken(1);
            var nextToken = _getNextToken(token);
            if ([CONST.UNARY_OP_TYPE, CONST.BINARY_OP_TYPE, CONST.TERNARY_OP_TYPE].indexOf(preToken.type) > -1) { //运算符之后没有操作数
                _handleError(line, 'unexpected \';\' after ' + preToken.value);
                return;
            }
            if (nextToken && nextToken.value == 'else') { //else之前应该是 IDENTIFIER_TYPE 或者 RESULT_TYPE
                _handleError(line, 'unexpected \';\' before ' + nextToken.value);
                return;
            }
            while (stack.length > 0) { //清空表达式
                var token = stack[stack.length - 1];
                if (token.line == line && (token.type < CONST.LEFT_PARENTHESES || token.type > CONST.RIGHT_BRACES)) {
                    stack.pop();
                } else {
                    if (token.value == '[') { //数组内有语句
                        _handleError(token.line, 'unexpected \']\' ');
                        return;
                    }
                    break;
                }
            }
        }
        //处理关键字
        function _handleKeyWord(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _gerPreToken(1);
            var nextToken = _getNextToken(token);
            if (['if', 'else if', 'else', 'while', 'for', 'catch', 'with', 'eval'].indexOf(token.value) > -1) { //其后必须紧跟'('
                if (!nextToken || nextToken.value != '(') {
                    _handleError(line, 'expected \'(\' after ' + token.value);
                    return;
                }
            } else if (['try', 'finally'].indexOf(token.value) > -1) { //其后必须紧跟'{'
                if (!nextToken || nextToken.value != '{') {
                    _handleError(line, 'expected \'{\' after ' + token.value);
                    return;
                }
            }
            if (preToken && preToken.line == token.line && [';', '{', '}'].indexOf(preToken.value) == -1) { //关键字前面必须是界符
                _handleError(line, 'expected \';\' before ' + token.value);
                return;
            }
            if (token.value == 'for') { //for表达式
            }
            stack.push(token);
        }
        //处理圆括号
        function _handleParentheses(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _gerPreToken(1);
            var nextToken = _getNextToken(token);
            if (token.value == '(') {
                if (nextToken && nextToken.type == CONST.KEYWORD_TYPE && !(preToken && preToken.value == 'for' && nextToken.value == 'var')) { //(后面不能跟关键字
                    _handleError(line, 'expected identifier after ' + token.value);
                    return;
                }
                stack.push(token);
            } else {
                var pPretoken = _gerPreToken(2);
                if (preToken) {
                    if (preToken.value == '(' || pPretoken && pPretoken.value == '(' && [CONST.IDENTIFIER_TYPE, CONST.CONSTANT_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) > -1) { //圆括号匹配正确
                        if (preToken.value == '(' && pPretoken.type != CONST.IDENTIFIER_TYPE) { //空()
                            _handleError(line, 'expected expression after ' + preToken.value);
                            return;
                        }
                        if (pPretoken && ['catch', 'with'].indexOf(pPretoken.value) > -1 && (!nextToken || nextToken.value != '{')) { //')'后面必须跟块语句
                            _handleError(line, 'expected \'{\' after ' + token.value);
                            return;
                        }
                        if (['if', 'else', 'while', 'for', 'catch', 'with'].indexOf(pPretoken && pPretoken.value) > -1) {
                            if (!nextToken || nextToken.value != '{') { //后面必须紧跟表达式或者块语句
                                _handleError(line, 'expected expression after ' + token.value);
                                return;
                            }
                        }
                    } else {
                        _handleError(line, 'unrecoverable \'(\'');
                        return;
                    }
                    stack.pop();
                    if (preToken.value != '(') {
                        stack.pop();
                    }
                    var _preToken = _gerPreToken(1);
                    if (_preToken && _preToken.type == CONST.IDENTIFIER_TYPE) { //函数调用
                        stack.pop();
                        _preToken = _gerPreToken(1);
                        if (_preToken && _preToken.value == 'function') { //函数声明
                            stack.pop();
                        }
                    }
                    var _token = { //生成处理结果
                        type: CONST.RESULT_TYPE,
                        line: token.line,
                        originToken: token
                    }
                    if (pPretoken && pPretoken.value == '(') { //(a)，可继续将a当做IDENTIFIER_TYPE，使之可以a++
                        var np = _getNextToken(pPretoken);
                        var _np = _getNextToken(np);
                        if (_np == token) {
                            _token.type = CONST.IDENTIFIER_TYPE;
                        }
                    }
                    //处理结果作为新的标识符
                    _handleIndentifier(token.line, _token);
                } else { //前面缺少左括号
                    _handleError(line, 'unrecoverable \'(\' ');
                    return;
                }
            }
        }
        //处理大括号
        function _handleBraces(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _gerPreToken(1);
            var pre4Token = _gerPreToken(4);
            var nextToken = _getNextToken(token);
            if (token.value == '{') {
                if (nextToken && _getNextToken(nextToken) == ':') {
                    startObjTokens.push(token);
                }
                stack.push(token);
            } else {
                if (preToken && preToken.value == '{') {
                    stack.pop();
                    _handleSemicolon(preToken.line, preToken); //语句块可以当作一个;
                } else if (pre4Token && pre4Token == startObjTokens[startObjTokens.length - 1]) { //对象字面量
                    stack.pop();
                    startObjTokens.pop();
                    token = { //生成处理结果
                        type: CONST.RESULT_TYPE,
                        line: token.line,
                        originToken: token
                    }
                    _handleIndentifier(token.line, token);
                } else {
                    _handleError(line, 'unrecoverable \'{\' ');
                }
            }
        }
        //处理方括号
        function _handleBracekts(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _gerPreToken(1);
            var pre2Token = _gerPreToken(2);
            var nextToken = _getNextToken(token);
            if (token.value == ']') {
                if (!preToken || !pre2Token) {
                    _handleError(line, 'unrecoverable \'[\' ');
                    return;
                } else if (preToken.value != '[' && (!pre2Token || pre2Token.value != '[')) {
                    _handleError(line, 'unrecoverable \'[\' ');
                    return;
                }
                stack.pop();
                if (preToken.value != '[') {
                    stack.pop();
                }
                token = {
                    type: CONST.RESULT_TYPE,
                    line: token.line,
                    originToken: token
                }
                _handleIndentifier(line, token);
            } else {
                stack.push(token);
            }
        }
        //处理单目运算符
        function _handleUnaryOp(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _gerPreToken(1);
            var nextToken = _getNextToken(token);
            if ((token.value == '++' || token.value == '--')) {
                if (!preToken || preToken.value == ';' && (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE)) { //;++1
                    _handleError(line, 'expected identifier after ' + token.value);
                    return;
                }
                if (preToken.type != CONST.IDENTIFIER_TYPE) { //1++
                    _handleError(preToken.line, 'bad operand ' + preToken.value);
                    return;
                }
            } else if (token.value == '!') { //单目运算符，只有!后面可跟RESULT_TYPE
                if (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE) {
                    _handleError(line, 'expected identifier after ' + token.value);
                    return;
                }
            }
            stack.push(token);
        }
        //处理双目运算符
        function _handBinaryOp(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _gerPreToken(1);
            var pre4Token = _gerPreToken(4);
            var nextToken = _getNextToken(token);
            if (!preToken || [CONST.IDENTIFIER_TYPE, CONST.CONSTANT_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) == -1) { //双目运算符必须要有左运算符
                if (['+', '-'].indexOf(token.value) == -1) { //+,-运算符也可以当作单目运算符
                    _handleError(preToken.line, 'expected left operand before ' + token.value);
                }
                return;
            }
            if (token.value == '.') {
                if (!preToken || [CONST.IDENTIFIER_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) == -1) { //.符号前必须是标识符或表达式结果
                    _handleError(line, 'expected identifier before \'.\'');
                    return;
                }
                if (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE) { //.符号后面必须是标识符
                    _handleError(line, 'expected identifier after \'.\'');
                    return;
                }
            }
            if (token.value == ',' && pre4Token == startObjTokens[startObjTokens.length - 1]) { //对象字面量
                stack.splice(stack.length - 3, 3);
            } else {
                stack.push(token);
            }
        }
        //处理三目运算符
        function _handTerNaryOp(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _gerPreToken(1);
            if (token.value == '?') {
                if (!preToken || [CONST.IDENTIFIER_TYPE, CONST.RESULT_TYPE, CONST.CONSTANT_TYPE].indexOf(preToken.type) == -1) {
                    _handleError(preToken.line, 'expected identifier before ' + token.value);
                    return;
                }
            }
            stack.push(token);
        }
        //处理标识符
        function _handleIndentifier(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _gerPreToken(1);
            var pre3token = _gerPreToken(3);
            var nextToken = _getNextToken(token);
            if (preToken) {
                if ([CONST.IDENTIFIER_TYPE, CONST.CONSTANT_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) > -1) { //标识符之前还是标识符
                    _handleError(preToken.line, 'expected \';\' ');
                    return;
                }
                if ([CONST.UNARY_OP_TYPE, CONST.BINARY_OP_TYPE].indexOf(preToken.type) > -1) { //标识符之前是单目或双目运算符
                    if (!(token.type == CONST.IDENTIFIER_TYPE && nextToken && nextToken.value == '(')) { //如果标识符是函数，需要等待函数结果
                        stack.pop();
                        if (preToken.type == CONST.BINARY_OP_TYPE) {
                            stack.pop();
                        }
                        stack.push({ //生成处理结果
                            type: CONST.RESULT_TYPE,
                            line: token.line,
                            originToken: token
                        })
                        return;
                    }
                }
                if (preToken.value == '?') { //检测三目运算符
                    if (!nextToken || nextToken != ':') {
                        _handleError(preToken.line, 'expected \':\' ');
                        return;
                    }
                }
                if (token.type != CONST.CONSTANT_TYPE && startObjTokens[startObjTokens.length - 1] == preToken) { //检测对象字面量
                    if (!nextToken || nextToken.value != ':') {
                        _handleError(preToken.line, 'expected \':\' ');
                        return;
                    }
                }
            }
            if (pre3token && startObjTokens[startObjTokens.length - 1] == pre3token &&
                (!nextToken || [',', '}'].indexOf(nextToken.value) == -1)) { //检测对象字面量
                _handleError(preToken.line, 'expected \',\' ');
                return;
            }
            stack.push(token);
        }
        //处理字符串
        function _handleString(line, token) {
            var preToken = _gerPreToken(token);
            if (!startStrToken) {
                startStrToken = token;
            } else if (startStrToken.type == token.type && preToken.value!='\\') {
                startStrToken = null;
                token = { //生成处理结果
                    type: CONST.RESULT_TYPE,
                    line: token.line,
                    originToken: token
                }
                _handleIndentifier(token.line, token);
            }
        }
        //处理转义符
        function _handleEscape(line, token) {
            var nextToken = _getNextToken(token);
            if (!startStrToken) {
                _handleError(token.line, 'expected \'\\\'');
                return;
            } else if (!nextToken) {
                _handleError(startStrToken.line, 'unclosed string');
                return;
            }
        }
        //处理多行注释
        function _handleComment(line, token) {
            if (startStrToken) {
                return;
            }
            if (token.value == '/*' && !startCommentToken) {
                startCommentToken = token;
            } else if (token.value == '*/') {
                if (!startCommentToken) {
                    _handleError(token.line, 'unrecoverable /*');
                    return;
                }
                startCommentToken = null;
            }
        }
    }
}

export default JsParser;