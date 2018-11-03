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
        var startObjTokens = [];
        var startStrToken = null;
        var startCommentToken = null;
        while (line <= endLine) {
            var tokens = this.editor.linesContext.getTokens(line);
            self.editor.linesContext.setError(line, '');
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
            }
            _handleEnd(line);
            line++;
        }
        _handleEnd(endLine, true);
        //获取前一个token
        function _getPreToken(distance) {
            if (typeof distance == 'number') {
                return stack[stack.length - distance];
            } else {
                var token = distance.originToken || distance;
                var line = token.line;
                var tokens = self.editor.linesContext.getTokens(line);
                var index = tokens.indexOf(token) - 1;
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
            token = token.originToken || token;
            var line = token.line;
            var tokens = self.editor.linesContext.getTokens(line);
            var index = tokens.indexOf(token) + 1;
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
        //处理错误行
        function _handleError(line, error) {
            self.editor.linesContext.setError(line, error);
        }

        function _handleEnd(line, ifOver) {
            var preToken = _getPreToken(1);
            var pre2Token = _getPreToken(2);
            if (startStrToken) {
                if (ifOver) {
                    _handleError(startStrToken.line, 'unclosed string');
                }
                return;
            }
            var tokens = self.editor.linesContext.getTokens(++line);
            var nextToken = tokens && tokens[0];
            //尾部是否可以清空(与下一行没有关联)
            if (!(preToken && [CONST.BINARY_OP_TYPE, CONST.TERNARY_OP_TYPE, CONST.KEYWORD_TYPE].indexOf(preToken.type) > -1) &&
                !(preToken && preToken.type == CONST.IDENTIFIER_TYPE && nextToken && ['++', '--'].indexOf(nextToken.value) > -1) &&
                !(nextToken && [CONST.BINARY_OP_TYPE, CONST.TERNARY_OP_TYPE].indexOf(nextToken.type) > -1) &&
                !(preToken && ['try', 'catch', 'if', 'else if', '?'].indexOf(preToken.value) > -1)) {
                while (stack.length > 0) { //清空表达式
                    var _token = stack[stack.length - 1];
                    if (_token.type < CONST.LEFT_PARENTHESES || _token.type > CONST.RIGHT_BRACES) {
                        stack.pop();
                    } else {
                        break;
                    }
                }
            }
            if (preToken && ifOver) {
                if (['(', '{', '['].indexOf(preToken.value) > -1) {
                    _handleError(preToken.line, 'unmatched ' + preToken.value);
                    return;
                }
                if (['?', ':'].indexOf(preToken.value) > -1) {
                    preToken = _getPreToken(2);
                }
                if ([CONST.BINARY_OP_TYPE, CONST.UNARY_OP_TYPE].indexOf(preToken.type) > -1) {
                    _handleError(preToken.line, 'expected right operand before' + preToken.value);
                    return;
                }
            }
        }
        //抛出整行界符之后的操作数和操作符
        function _handleSemicolon(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _getPreToken(1);
            var nextToken = _getNextToken(token);
            if (preToken && [CONST.UNARY_OP_TYPE, CONST.BINARY_OP_TYPE, CONST.TERNARY_OP_TYPE].indexOf(preToken.type) > -1) { //运算符之后没有操作数
                _handleError(line, 'unexpected statement after ' + preToken.value);
                return;
            }
            if (preToken && ['try', 'catch', 'if', 'else if', '?'].indexOf(preToken.value) > -1 &&
                nextToken && ['catch', 'finally', 'else if', 'else', ':'].indexOf(nextToken.value) > -1) { //流程控制语句未结束
                return;
            }
            while (stack.length > 0) { //清空表达式
                var _token = stack[stack.length - 1];
                if ([';'].indexOf(_token.value) == -1 && (_token.type < CONST.LEFT_PARENTHESES || _token.type > CONST.RIGHT_BRACES)) {
                    stack.pop();
                } else {
                    if (['['].indexOf(_token.value) > -1) { //数组内或者三目运算符内有语句
                        _handleError(_token.line, 'unexpected \']\' ');
                        return;
                    }
                    break;
                }
            }
            var pre2Token = _getPreToken(2);
            preToken = _getPreToken(1);
            if (preToken && (preToken.value == ';' || preToken.value == '(' && pre2Token && pre2Token.value == 'for')) { //加入;用于验证for表达式
                if (stack[stack.length - 2] && stack[stack.length - 2].value == ';') { //for循环括号最多只能有3个表达式
                    _handleError(line, 'expected \')\' after ' + preToken.value);
                    return;
                } else {
                    stack.push(token);
                }
            }
            if (startObjTokens.indexOf(preToken) > -1) { //对象字面量声明错误
                _handleError(preToken.line, 'expected \'}\' before ' + preToken.value);
                return;
            }
        }
        //处理关键字
        function _handleKeyWord(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _getPreToken(1);
            var pre2Token = _getPreToken(2);
            var nextToken = _getNextToken(token);
            var next2Token = nextToken && _getNextToken(nextToken);
            if (['if', 'else if', 'else', 'while', 'for', 'catch', 'with', 'switch'].indexOf(token.value) > -1) {
                if (token.value == 'else') { //其后必须跟表达式或语句
                    if (!nextToken) {
                        _handleError(line, 'expected statement after ' + token.value);
                        return;
                    }
                } else if (!nextToken || nextToken.value != '(') { //其后必须紧跟'('
                    _handleError(line, 'expected \'(\' after ' + token.value);
                    return;
                }
                if (['else', 'else if'].indexOf(token.value) > -1 && !(preToken && preToken.value == 'if')) { //else 之前必须要有 if
                    _handleError(line, 'expected \'if\' before ' + token.value);
                    return;
                }
            } else if (['try', 'finally'].indexOf(token.value) > -1) {
                if (!nextToken || nextToken.value != '{') { //其后必须紧跟'{'
                    _handleError(line, 'expected \'{\' after ' + token.value);
                    return;
                }
                if (token.value == 'finally' && !(preToken && ['try', 'catch'].indexOf(preToken.value) > -1)) { //finally 之前必须要有 try,catch
                    _handleError(line, 'expected \'try\' before ' + token.value);
                    return;
                }
            } else if (token.value == 'catch' && !(preToken && preToken.value == 'try')) { //catch 之前必须要有 try
                _handleError(line, 'expected \'try\' before ' + token.value);
                return;
            }
            if (preToken && [';', '{', '}'].indexOf(preToken.value) == -1 && ['else', 'else if', 'catch', 'finally'].indexOf(token.value) == -1) { //关键字前面必须是界符
                if (token.value == 'var' && pre2Token.value == 'for') { //for 表达式中的 var 关键字比较特殊
                    if (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE) {
                        _handleError(line, 'expected \'in\' after ' + token.value);
                        return;
                    }
                } else {
                    _handleError(line, 'expected statement before ' + token.value);
                    return;
                }
            }
            stack.push(token);
        }
        //处理圆括号
        function _handleParentheses(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _getPreToken(1);
            var pre2Token = _getPreToken(2);
            var pre3Token = _getPreToken(3);
            var nextToken = _getNextToken(token);
            if (token.value == '(') {
                if (!nextToken) {
                    _handleError(line, 'expected expression after ' + token.value);
                    return;
                } else if (nextToken.value == ')' && preToken.type != CONST.IDENTIFIER_TYPE) { //空()
                    _handleError(line, 'expected expression after ' + preToken.value);
                    return;
                }
                stack.push(token);
            } else {
                if (preToken) {
                    if (preToken.value == ';' || pre2Token && pre2Token.value == ';') { //for循环表达式
                        if (preToken.value != ';') {
                            stack.pop();
                        }
                        if (!stack[stack.length - 2] || stack[stack.length - 2].value != ';') { //for圆括号内内必须有三个表达式
                            _handleError(line, 'expected statement after ' + preToken.value);
                            return;
                        }
                        stack.splice(stack.length - 4, 4);
                        if (!nextToken) { //后面必须紧跟表达式或者块语句
                            _handleError(line, 'expected statement after ' + token.value);
                        }
                        return;
                    } else if (pre2Token && pre2Token.value == 'var') { //for in 表达式
                        stack.splice(stack.length - 4, 4);
                        if (!nextToken) { //后面必须紧跟表达式或者块语句
                            _handleError(line, 'expected statement after ' + token.value);
                        }
                        return;
                    } else if (preToken.value == '(' || pre2Token && pre2Token.value == '(' && [CONST.IDENTIFIER_TYPE, CONST.CONSTANT_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) > -1) { //圆括号匹配正确
                        //')'后面必须跟块语句
                        if (pre3Token && ['catch', 'with', 'switch'].indexOf(pre3Token.value) > -1 && (!nextToken || nextToken.value != '{')) {
                            _handleError(line, 'expected \'{\' after ' + token.value);
                            return;
                        }
                        //')'后面必须紧跟表达式或者块语句
                        if (pre3Token && ['if', 'else', 'while', 'for', 'catch', 'with'].indexOf(pre3Token.value) > -1 && !nextToken) {
                            _handleError(line, 'expected expression after ' + token.value);
                            return;
                        }
                    } else {
                        _handleError(line, 'unrecoverable \'(\'');
                        return;
                    }
                    if (pre2Token && pre2Token.value == 'in') { //for in 表达式
                        if (!nextToken) {
                            _handleError(line, 'expected statement after ' + token.value);
                            return;
                        }
                    }
                    stack.pop();
                    if (preToken.value != '(') {
                        stack.pop();
                    }
                    var _preToken = _getPreToken(1);
                    if (_preToken && ['if', 'else if', 'catch', 'switch', '?'].indexOf(_preToken.value) > -1) { //如果是流程控制关键字，直接返回
                        return;
                    }
                    if (_preToken && _preToken.type == CONST.IDENTIFIER_TYPE) { //函数调用
                        stack.pop();
                        _preToken = _getPreToken(1);
                        if (_preToken && _preToken.value == 'function') { //函数声明
                            stack.pop();
                        }
                    }
                    var _token = { //生成处理结果
                        type: CONST.RESULT_TYPE,
                        line: token.line,
                        originToken: token
                    }
                    if (pre2Token && pre2Token.value == '(' && preToken.type == CONST.IDENTIFIER_TYPE) { //(a)，可继续将a当做IDENTIFIER_TYPE，使之可以a++
                        _token.type = CONST.IDENTIFIER_TYPE;
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
            if (token.value == '{') {
                stack.push(token);
            } else {
                _handleSemicolon(line, token);
                var preToken = _getPreToken(1);
                var nextToken = _getNextToken(token);
                var next2Token = nextToken && _getNextToken(nextToken);
                var startObj = startObjTokens[startObjTokens.length - 1];
                if (preToken == startObj) { //对象字面量结束
                    if (preToken == startObj) {
                        stack.pop();
                    } else {
                        stack.splice(stack.length - 4, 4);
                    }
                    startObjTokens.pop();
                    token = { //生成处理结果
                        type: CONST.RESULT_TYPE,
                        line: token.line,
                        originToken: token
                    }
                    _handleIndentifier(token.line, token);
                } else if (preToken && preToken.value == '{') {
                    stack.pop();
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
            var preToken = _getPreToken(1);
            var pre2Token = _getPreToken(2);
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
                if (preToken && [CONST.RESULT_TYPE, CONST.IDENTIFIER_TYPE].indexOf(preToken.type) > -1) { //如果是数组
                    stack.pop();
                }
                stack.push(token);
            }
        }
        //处理单目运算符
        function _handleUnaryOp(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _getPreToken(1);
            var nextToken = _getNextToken(token);
            if ((token.value == '++' || token.value == '--')) {
                if (!preToken || preToken.value == ';' && (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE)) { //;++1
                    _handleError(line, 'expected identifier after ' + token.value);
                    return;
                } else if (preToken && preToken.type == CONST.IDENTIFIER_TYPE) {
                    stack.pop();
                    token = { //生成处理结果
                        type: CONST.RESULT_TYPE,
                        line: token.line,
                        originToken: token
                    }
                    _handleIndentifier(token.line, token);
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
            var preToken = _getPreToken(1);
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
            if (token.value == ',') {
                _handleEnd(line);
            } else {
                stack.push(token);
            }
        }
        //处理三目运算符
        function _handTerNaryOp(line, token) {
            if (startStrToken || startCommentToken) {
                return;
            }
            var preToken = _getPreToken(1);
            var pre2Token = _getPreToken(2);
            var nextToken = _getNextToken(token);
            if (token.value == '?') {
                if (!preToken || [CONST.IDENTIFIER_TYPE, CONST.RESULT_TYPE, CONST.CONSTANT_TYPE].indexOf(preToken.type) == -1) {
                    _handleError(line, 'expected identifier before ' + token.value);
                    return;
                }
                if (!nextToken) {
                    _handleError(line, 'expected statement after ' + token.value);
                    return;
                }
            } else if (token.value == 'case') {
                _handleSemicolon(line, token); //清除之前的 case
                if (!(preToken && preToken.value == '{' && pre2Token && pre2Token.value == 'switch')) {
                    _handleError(line, 'unexpected \'case\' ');
                    return;
                }
                if (!nextToken) {
                    _handleError(line, 'expected statement after ' + token.value);
                    return;
                }
            } else if (token.value == ':') {
                if (!preToken || !pre2Token) {
                    _handleError(preToken.line, 'unexpected \':\' ');
                    return;
                } else if (['{', 'case'].indexOf(pre2Token.value) == -1 && preToken.value != '?') {
                    _handleError(line, 'unexpected \':\' ');
                    return;
                } else if (pre2Token.value == '{' && !(preToken.type == CONST.IDENTIFIER_TYPE || preToken.resultType == CONST.STRING_TYPE)) {
                    _handleError(line, 'expected identifier before \':\' ');
                    return;
                } else if (pre2Token.value == 'case' && [CONST.IDENTIFIER_TYPE, CONST.CONSTANT_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) == -1) { //case 和 ? 语句后必须是表达式结果
                    _handleError(line, 'unexpected \':\' ');
                    return;
                } else if (pre2Token.value == '{') {
                    startObjTokens.push(pre2Token);
                }
                if (!nextToken) {
                    _handleError(line, 'expected statement after ' + token.value);
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
            var preToken = _getPreToken(1);
            var pre2Token = _getPreToken(2);
            var pre3Token = _getPreToken(3);
            var nextToken = _getNextToken(token);
            if (preToken) {
                if (preToken && ['try', 'catch', 'if', 'else if', '?'].indexOf(preToken.value) > -1 &&
                    nextToken && ['catch', 'finally', 'else if', 'else', ':'].indexOf(nextToken.value) > -1) { //流程控制语句未结束
                    return;
                }
                if ([CONST.IDENTIFIER_TYPE, CONST.CONSTANT_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) > -1) { //标识符之前还是标识符
                    _handleError(preToken.line, 'expected statement ');
                    return;
                }
                if (preToken.type == CONST.UNARY_OP_TYPE) {
                    if (token.type == CONST.RESULT_TYPE && preToken.value != '!') { //单目运算符，只有!后面可跟RESULT_TYPE
                        _handleError(line, 'expected identifier after ' + token.value);
                        return;
                    }
                    stack.pop();
                    preToken = _getPreToken(1);
                }
                if ([CONST.BINARY_OP_TYPE].indexOf(preToken.type) > -1) { //标识符之前是单目或双目运算符
                    //如果标识符是函数或者前缀表达式或者后面运算符优先级较高，需要等待执行结果
                    if (!(token.type == CONST.IDENTIFIER_TYPE && nextToken && (nextToken.value == '(') || ['++', '--'].indexOf(token.value) > -1) &&
                        !(nextToken && nextToken.type == CONST.BINARY_OP_TYPE && (preToken.value.substr(-1) == '=' || ['||', '&&'].indexOf(preToken.value) > -1))) {
                        if (preToken.value == 'in') { //in 之后必须是标识符
                            if (token.type != CONST.IDENTIFIER_TYPE) {
                                _handleError(preToken.line, 'expected identifier after \'in\' ');
                                return;
                            }
                        }
                        stack.pop();
                        if (preToken.type == CONST.BINARY_OP_TYPE) {
                            stack.pop();
                        }
                        token = { //生成处理结果
                            type: CONST.RESULT_TYPE,
                            line: token.line,
                            originToken: token.originToken || token
                        }
                        _handleIndentifier(token.line, token);
                        return;
                    }
                } else if (preToken.value == '?' && !nextToken) {
                    _handleError(preToken.line, 'expected statement after \'' + token.value + '\'');
                    return;
                } else if (preToken.value == ':' && pre2Token && pre2Token.value == '?' &&
                    !(nextToken && nextToken.type == CONST.BINARY_OP_TYPE)) {
                    stack.splice(stack.length - 3, 3);
                    token = { //生成处理结果
                        type: CONST.RESULT_TYPE,
                        line: token.line,
                        originToken: token.originToken || token
                    }
                    _handleIndentifier(token.line, token);
                    return;
                }
                //检测对象字面量关键字
                if ((token.type == CONST.IDENTIFIER_TYPE || token.resultType == CONST.STRING_TYPE) && startObjTokens[startObjTokens.length - 1] == preToken) {
                    if (!nextToken || nextToken.value != ':') {
                        _handleError(preToken.line, 'expected \':\' ');
                        return;
                    }
                }
                //检测对象字面量尾部
                if (pre3Token && startObjTokens[startObjTokens.length - 1] == pre3Token && !nextToken) {
                    _handleError(preToken.line, 'expected \'}\' ');
                    return;
                }
            }
            stack.push(token);
        }
        //处理字符串
        function _handleString(line, token) {
            var preToken = _getPreToken(token);
            if (!startStrToken) {
                startStrToken = token;
            } else if (startStrToken.type == token.type && preToken.value != '\\') {
                startStrToken = null;
                token = { //生成处理结果
                    type: CONST.RESULT_TYPE,
                    line: token.line,
                    originToken: token,
                    resultType: CONST.STRING_TYPE
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