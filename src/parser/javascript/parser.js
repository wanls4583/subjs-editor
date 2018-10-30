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
        var lineError = false;
        var startObjTokens = [];
        var startStrToken = null;
        var startCommentToken = null;
        while (line <= endLine) {
            var tokens = this.editor.lineContext.getTokens(line);
            lineError = false;
            for (var i = 0; i < tokens.length; i++) {
                var token = tokens[i];
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
                        _handleBraces();
                        break;
                    case CONST.IDENTIFIER_TYPE:
                    case CONST.NUMBE_TYPE:
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
                        CONST.END_COMMENT_TYPE:
                            _handleComment(line, token);
                        break;

                }
                if (lineError) {
                    break;
                }
            }
            _handleEnd(line, token);
        }
        //获取前一个token
        function _gerPreToken(distance) {
            return stack[stack.length - distance];
        }
        //获取下一个token
        function _getNextToken(token) {
            var line = token.line;
            var tokens = this.editor.lineContext.getTokens(line);
            var index = tokens.indexOf(token) + 1;
            while (line <= endLine) {
                if (index < tokens.length) {
                    return tokens[index];
                } else {
                    tokens = this.editor.lineContext.getTokens(++line);
                }
            }
            return null;
        }
        //清空一行
        function _empty(line) {
            while (stack.length) {
                if (stack[i].line == line) {
                    stack.pop();
                } else {
                    break;
                }
            }
        }
        //处理错误行
        function _handleError(line, error) {
            lineError = true;
            this.editor.lineContext.setError(line, error);
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
            var nextToken = _getNextToken();
            if ([CONST.UNARY_OP_TYPE, CONST.BINARY_OP_TYPE, CONST.TERNARY_OP_TYPE].indexOf(preToken.type) > -1) { //运算符之后没有操作数
                _handleError(line, 'unexpected \';\' after \'' + preToken.value + '\'');
                return;
            }
            if (nextToken.value == 'else') { //else之前应该是 IDENTIFIER_TYPE 或者 RESULT_TYPE
                _handleError(line, 'unexpected \';\' before \'' + nextToken.value + '\'');
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
        //处理关键字
        function _handleKeyWord(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            if (['if', 'else if', 'else', 'while', 'for', 'catch', 'with', 'eval'].indexOf(token.value) > -1) { //其后必须紧跟'('
                if (nextToken.value != '(') {
                    _handleError(line, 'expected \'(\' after \'' + token.value + '\'');
                    return;
                }
            } else if (['try', 'finally'].indexOf(token.value) > -1) { //其后必须紧跟'{'
                if (nextToken.value != '{') {
                    _handleError(line, 'expected \'{\' after \'' + token.value + '\'');
                    return;
                }
            }
            if (preToken && preToken.line == line && preToken.value != ';' &&
                (token.type < CONST.LEFT_PARENTHESES || token.type > CONST.RIGHT_BRACES)) { //关键字前面必须是界符
                _handleError(line, 'expected \';\' before \'' + token.value + '\'');
                return;
            }
            if (token.value == 'for') { //for表达式
                _checkForExp(line, token);
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
                if (nextToken && nextToken.type != CONST.IDENTIFIER_TYPE &&
                    nextToken.type != CONST.RESULT_TYPE && nextToken.type != CONST.NUMBE_TYPE) { //(后面非法字符
                    _handleError(line, 'expected identifier after \'' + token.value + '\'');
                    return;
                }
                stack.push(token);
            } else {
                var pPretoken = _gerPreToken(2);
                if (preToken) {
                    if (preToken.type == CONST.IDENTIFIER_TYPE && pPretoken && pPretoken.value == '(' || preToken.value == '(') {
                        if (preToken.value == '(' && pPretoken.type != CONST.IDENTIFIER_TYPE) { //空()
                            _handleError(line, 'expected expression after \'' + preToken.value + '\'');
                            return;
                        }
                        if (pPretoken && ['catch', 'with'].indexOf(pPretoken.value) > -1 && (!nextToken || nextToken.value != '{')) { //')'后面必须跟'{'
                            _handleError(line, 'expected \'{\' after \'' + token.value + '\'');
                            return;
                        }
                    } else {
                        _handleError(line, 'unrecoverable \'(\' before \'' + token.value + '\'');
                        return;
                    }
                    stack.pop();
                    preToken.value != '(' && stack.pop();
                    var _token = {
                        type: RESULT_TYPE,
                        line: token.line
                    }
                    if (pPretoken && pPretoken.value == '(') { //(a)，可继续将a当做IDENTIFIER_TYPE，使之可以a++
                        var np = _getNextToken(pPretoken);
                        var _np = _getNextToken(np);
                        if (_np == token) {
                            _token.type = IDENTIFIER_TYPE;
                        }
                    }
                    //处理结果作为新的标识符
                    _handleIndentifier(token.line, _token);
                } else { //前面缺少左括号
                    _handleError(line, 'unrecoverable \'(\' before \'' + token.value + '\'');
                    return;
                }
                if (preToken && ['if', 'else', 'while', 'for', 'catch', 'with'].indexOf(pPretoken && pPretoken.value) > -1) {
                    if (!nextToken || nextToken.value != '{') { //后面必须紧跟表达式
                        _handleError(line, 'expected expression after \'' + token.value + '\'');
                        return;
                    }
                }
            }
        }
        //处理大括号
        function _handleBraces(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _getNextToken(token);
            var pre4Token = _gerPreToken(4);
            var nextToken = _getNextToken(token);
            if (token.value == '{') {
                if (_getNextToken(nextToken) == ':') {
                    startObjTokens.push(token);
                }
                stack.push(token);
            } else {
                if (preToken.value == '{') {
                    stack.pop();
                    _handleSemicolon(preToken.line); //语句块可以当作一个;
                } else if (pre4Token == startObjTokens[startObjTokens.length - 1]) { //对象字面量
                    stack.pop();
                    startObjTokens.pop();
                    token = {
                        type: RESULT_TYPE,
                        line: token.line
                    }
                    _handleIndentifier(token.line, token);
                } else {
                    _handleError(line, 'unrecoverable \'{\' before \'' + token.value + '\'');
                }
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
                    _handleError(line, 'expected identifier after \'' + token.value + '\'');
                    return;
                } else if (preToken.type != CONST.IDENTIFIER_TYPE) { //1++
                    _handleError(preToken.line, 'bad operand \'' + preToken.value + '\'');
                    return;
                }
            } else if (token.value == '.') {
                if (!preToken || preToken.type != CONST.IDENTIFIER_TYPE) {
                    _handleError(line, 'expected identifier before \'.\'');
                    return;
                } else if (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE) {
                    _handleError(line, 'expected identifier after \'.\'');
                    return;
                }
            } else if (token.value == '!') { //单目运算符，只有!后面可跟RESULT_TYPE
                if (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE) {
                    _handleError(line, 'expected identifier after \'' + token.value + '\'');
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
            if (!preToken || [CONST.IDENTIFIER_TYPE, CONST.NUMBE_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) == -1) {
                _handleError(preToken.line, 'expected left operand before \'' + token.value + '\'');
                return;
            }
            if (token.value == ',' && pre4Token == startStrToken[startStrToken.length - 1]) { //对象字面量
                stack.splice(stack.length - 3, 3);
            } else {
                stack.push(token);
            }
        }
        //处理三目运算符
        function _handTerNaryOp(line, token) {
            var preToken = _gerPreToken(1);
            if (token.value == '?') {
                if (!preToken || preToken.t)
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
                if ([CONST.IDENTIFIER_TYPE, CONST.NUMBE_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) > -1) { //标识符之前还是标识符
                    _handleError(preToken.line, 'expected \';\' after \'' + preToken.value + '\'');
                    return;
                } else if ([CONST.UNARY_OP_TYPE, CONST.BINARY_OP_TYPE].indexOf(preToken.type) > -1) { //标识符之前是单目或双目运算符
                    stack.pop();
                    if (preToken.type == CONST.BINARY_OP_TYPE) {
                        stack.pop();
                    }
                    stack.push({
                        type: CONST.RESULT_TYPE,
                        line: token.line
                    })
                } else if (preToken.value == '?') { //检测三目运算符
                    if (!nextToken || nextToken != ':') {
                        _handleError(preToken.line, 'expected \':\' after \'' + preToken.value + '\'');
                        return;
                    }
                } else if (startObjTokens[startObjTokens.length - 1] == preToken) { //检测对象字面量
                    if (nextToken.value != ':') {
                        _handleError(preToken.line, 'expected \':\' before \'' + nextToken.value + '\'');
                        return;
                    }
                } else if (startObjTokens[startObjTokens.length - 1] == pre3token) { //检测对象字面量
                    if ([',', '}'].indexOf(nextToken.value) == -1) {
                        _handleError(preToken.line, 'expected \',\' before \'' + nextToken.value + '\'');
                        return;
                    }
                }
            }
            stack.push(token);
        }
        //处理字符串
        function _handleString(line, token) {
            if (!startStrToken) {
                startStrToken = token;
            } else if (startStrToken.type == token.type) {
                startStrToken = null;
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
        //验证for表达式
        function _checkForExp(line, token) {
            var tokens = this.editor.lineContext.getTokens(line);
            var index = tokens.indexOf(token) + 2;
            var semis = []; //分号的数量(for 语句中只能有两个';')
            var inTokens = [];
            while (tokens) {
                if (index < tokens.length) {
                    if (tokens[index].value == ';') {
                        semis.push(token);
                    } else if (tokens[index].value == ')') {
                        break;
                    }
                    inTokens.push(tokens[index]);
                    index++;
                } else {
                    index = 0;
                    tokens = this.editor.lineContext.getTokens(++line);
                    if (!tokens) {
                        break;
                    }
                }
            }
            if (semis.length == 0) { //验证是否符合 for in
                if (!(inTokens.length == 4 && inTokens[0].value == 'var' && inTokens[1].type == CONST.IDENTIFIER_TYPE &&
                        inTokens[2].value == 'in' && inTokens[3].type == CONST.IDENTIFIER_TYPE)) {
                    _handleError(line, 'bad for expression');
                }
            } else if (semis.length != 2) {
                _handleError(line, 'bad for expression');
            }
        }
    }
}

export default JsParser;