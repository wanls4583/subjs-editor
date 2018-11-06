import Parser from '../core/parser.js';
import Tokenizer from './tokenizer.js';
import CONST from '../../common/const.js';
import Util from '../../common/util.js';

class JsParser extends Parser {
    constructor(editor) {
        super(editor, Tokenizer);
        this.stackHistory = []; //存储解析结果
    }
    /**
     * 语法分析
     * @param  {Number} firstLine 开始分析的首行
     */
    parse(firstLine) {
        var self = this;
        var endLine = this.editor.linesContext.getLength();
        var stackIndex = Math.floor(firstLine / 100) - 1;
        var line = (stackIndex + 1) * 100 + 1;
        var stack = this.stackHistory[stackIndex]; //操作栈
        if (!stack) {
            if (stackIndex > this.stackHistory.length - 1 && this.stackHistory.length) {
                line = this.stackHistory.length * 100 + 1;
                stack = this.stackHistory[this.stackHistory.length - 1];
            } else {
                line = 1;
                stack = [];
            }
        } else {
            this.stackHistory = this.stackHistory.slice(0, stackIndex + 1);
        }
        stack = Util.copyObj(stack);
        var startObjTokens = stack.startObjTokens || []; //对象字面量
        var startStrToken = stack.startStrToken; //字符串开始
        var startCommentToken = stack.startCommentToken; //多行注释开始
        var startRegToken = stack.startRegToken; //正则字面量
        var startDeconstruction = stack.startDeconstruction; //es6解构表达式
        var skipToken = 0; //需要跳过的token数量
        clearTimeout(this.timer);
        _startParse();

        function _startParse() {
            var startTime = new Date().getTime();
            self.tokenizer.analysis(line); //分词
            while (line <= endLine && new Date().getTime() - startTime < 17) {
                //最少执行100次，防止频繁获取时间戳
                for (var count = 0; count < 100 && line <= endLine; count++) {
                    self.tokenizer.analysis(line + 1); //下一行分词
                    var tmp = line;
                    while (tmp < endLine && !self.editor.linesContext.getTokens(++tmp)) {
                        self.tokenizer.analysis(tmp);
                    }
                    self.editor.linesContext.setError(line, '');
                    var tokens = self.editor.linesContext.getTokens(line);
                    for (var i = 0; i < tokens.length; i++) {
                        var token = tokens[i];
                        token.line = line;
                        skipToken = 0;
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
                            case CONST.ILLEGAL_TYPE:
                                _handleIllegal(line, token);
                                break;
                        }
                        i += skipToken;
                    }
                    _handleEnd(line);
                    _storeStack(line);
                    line++;
                }
            }
            if (line > endLine) {
                _handleEnd(endLine, true);
            } else {
                self.timer = setTimeout(function() {
                    _startParse();
                });
            }
        }
        //获取前一个token
        function _getPreToken(distance) {
            if (typeof distance == 'number') {
                return stack[stack.length - distance];
            } else {
                var token = distance.originToken || distance;
                var line = token.line;
                var tokens = self.editor.linesContext.getTokens(line);
                var index = tokens.indexOf(token) - 1;
                while (line >= 1) {
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
                    tokens[index].line = line;
                    return tokens[index];
                } else {
                    tokens = self.editor.linesContext.getTokens(++line);
                    index = 0;
                }
            }
            return null;
        }
        //抛出token
        function _popUntil(token) {
            if (token) {
                while (stack.length) {
                    var _token = stack.pop();
                    if (_token == token) {
                        break;
                    }
                }
            } else {
                while (stack.length) {
                    var _token = stack[stack.length - 1];
                    if (_token.type < CONST.LEFT_PARENTHESES || _token.type > CONST.RIGHT_BRACES) {
                        stack.pop();
                    } else {
                        break;
                    }
                }
            }
        }
        //处理错误行
        function _handleError(line, error) {
            if (!self.editor.linesContext.getError(line)) {
                self.editor.linesContext.setError(line, error);
            }
            _popUntil();
        }
        //存储执行结果
        function _storeStack(line) {
            if (line % 100 == 0) {
                self.stackHistory[line / 100 - 1] = [];
                var arr = self.stackHistory[line / 100 - 1];
                for (var i = 0, length = stack.length; i < length; i++) {
                    arr.push(stack[i]);
                }
                arr.startStrToken = startStrToken;
                arr.startRegToken = startRegToken;
                arr.startCommentToken = startCommentToken;
                arr.startObjTokens = arr.startObjTokens;
            }
        }
        //token位置
        function _locate(token) {
            token = token.originToken || token;
            return '\'' + token.value + '\' (col:' + (token.start + 1) + ')'
        }
        //行尾处理
        function _handleEnd(line, ifOver) {
            var preToken = _getPreToken(1);
            var pre2Token = _getPreToken(2);
            if (startStrToken) {
                if (ifOver) {
                    _handleError(startStrToken.line, 'unclosed string ' + _locate(startStrToken));
                }
                return;
            }
            if (startRegToken) {
                _handleError(startRegToken.line, 'unclosed reg ' + _locate(startRegToken));
                startRegToken = null;
                return;
            }
            var tokens = self.editor.linesContext.getTokens(++line);
            var nextToken = tokens && tokens[0];
            //尾部是否可以清空(与下一行没有关联)
            if (!(preToken && [CONST.BINARY_OP_TYPE, CONST.TERNARY_OP_TYPE, CONST.KEYWORD_TYPE].indexOf(preToken.type) > -1) &&
                !(preToken && preToken.type == CONST.IDENTIFIER_TYPE && nextToken && ['++', '--'].indexOf(nextToken.value) > -1) &&
                !(nextToken && [CONST.BINARY_OP_TYPE, CONST.TERNARY_OP_TYPE].indexOf(nextToken.type) > -1) &&
                !(preToken && ['try', 'catch', 'if', 'else if', '?'].indexOf(preToken.value) > -1 &&
                    nextToken && ['catch', 'finally', 'else if', 'else', ':'].indexOf(nextToken.value) > -1)) {
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
                    _handleError(preToken.line, 'unmatched ' + _locate(preToken));
                    return;
                }
                if (['?', ':'].indexOf(preToken.value) > -1) {
                    preToken = _getPreToken(2);
                }
                if ([CONST.BINARY_OP_TYPE, CONST.UNARY_OP_TYPE].indexOf(preToken.type) > -1) {
                    _handleError(preToken.line, 'expected right operand before ' + _locate(preToken));
                    return;
                }
            }
        }
        //抛出整行界符之后的操作数和操作符
        function _handleSemicolon(line, token) {
            if (startStrToken || startCommentToken || startRegToken) {
                return;
            }
            var preToken = _getPreToken(1);
            var nextToken = _getNextToken(token);
            if (token.value != '}' && startDeconstruction) { //解构表达式里有语句
                _handleError(startDeconstruction.line, 'unexpected ' + _locate(startDeconstruction));
                startDeconstruction = null;
                return;
            }
            //运算符之后没有操作数
            if (preToken && preToken.value != ':' && [CONST.UNARY_OP_TYPE, CONST.BINARY_OP_TYPE, CONST.TERNARY_OP_TYPE].indexOf(preToken.type) > -1) {
                _handleError(preToken.line, 'unexpected statement after ' + _locate(preToken));
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
                        _handleError(_token.line, 'unexpected ' + _locate(_token));
                        return;
                    }
                    break;
                }
            }
            var pre2Token = _getPreToken(2);
            preToken = _getPreToken(1);
            if (preToken && (preToken.value == ';' || preToken.value == '(' && pre2Token && pre2Token.value == 'for')) { //加入;用于验证for表达式
                if (stack[stack.length - 2] && stack[stack.length - 2].value == ';') { //for循环括号最多只能有3个表达式
                    _handleError(preToken.line, 'expected \')\' after ' + _locate(preToken));
                    return;
                } else {
                    stack.push(token);
                }
            }
            if (startObjTokens.indexOf(preToken) > -1 && token.value == ';') { //对象字面量声明错误
                _handleError(preToken.line, 'expected \'}\' before ' + _locate(preToken));
                return;
            }
        }
        //处理圆括号
        function _handleParentheses(line, token) {
            if (startStrToken || startCommentToken || startRegToken) {
                return;
            }
            var preToken = _getPreToken(1);
            var pre2Token = _getPreToken(2);
            var pre3Token = _getPreToken(3);
            var nextToken = _getNextToken(token);
            if (token.value == '(') {
                if (!nextToken) {
                    _handleError(line, 'expected expression after ' + _locate(token));
                    return;
                } else if (nextToken.value == ')' && preToken.type != CONST.IDENTIFIER_TYPE && preToken.value != 'function') { //空()
                    _handleError(preToken.line, 'expected expression after ' + _locate(preToken));
                    skipToken = 1;
                    return;
                }
                if (preToken && preToken.value == 'delete') { //delete 关键字转换成标识符
                    preToken.type = CONST.IDENTIFIER_TYPE;
                }
                stack.push(token);
            } else {
                if (preToken) {
                    if (preToken.value == ';' || pre2Token && pre2Token.value == ';') { //for循环表达式
                        if (preToken.value != ';') {
                            stack.pop();
                        }
                        if (!stack[stack.length - 2] || stack[stack.length - 2].value != ';') { //for圆括号内内必须有三个表达式
                            _handleError(preToken.line, 'expected statement after ' + _locate(preToken));
                            return;
                        }
                        stack.splice(stack.length - 4, 4);
                        if (!nextToken) { //后面必须紧跟表达式或者块语句
                            _handleError(line, 'expected statement after ' + _locate(token));
                        }
                        return;
                    } else if (pre2Token && pre2Token.value == 'var') { //for in 表达式
                        stack.splice(stack.length - 4, 4);
                        if (!nextToken) { //后面必须紧跟表达式或者块语句
                            _handleError(line, 'expected statement after ' + _locate(token));
                        }
                        return;
                    } else if (preToken.value == '(' || pre2Token && pre2Token.value == '(' && [CONST.IDENTIFIER_TYPE, CONST.CONSTANT_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) > -1) { //圆括号匹配正确
                        //')'后面必须跟块语句
                        if (pre3Token && ['catch', 'with', 'switch'].indexOf(pre3Token.value) > -1 && (!nextToken || nextToken.value != '{')) {
                            _handleError(line, 'expected \'{\' after ' + _locate(token));
                            return;
                        }
                        //')'后面必须紧跟表达式或者块语句
                        if (pre3Token && ['if', 'else', 'while', 'for', 'catch', 'with'].indexOf(pre3Token.value) > -1 && !nextToken) {
                            _handleError(line, 'expected expression after ' + _locate(token));
                            return;
                        }
                    } else {
                        _handleError(line, 'unrecoverable ' + _locate(token));
                        return;
                    }
                    if (pre2Token && pre2Token.value == 'in') { //for in 表达式
                        if (!nextToken) {
                            _handleError(line, 'expected statement after ' + _locate(token));
                            return;
                        }
                    }
                    stack.pop();
                    if (preToken.value != '(') {
                        stack.pop();
                    }
                    var _preToken = _getPreToken(1);
                    var _token = { //生成处理结果
                        type: CONST.RESULT_TYPE,
                        line: token.line,
                        originToken: token
                    }
                    if (_preToken && ['if', 'else if', 'catch', '?', 'switch'].indexOf(_preToken.value) > -1) { //如果是流程控制关键字，直接返回
                        return;
                    }
                    if (_preToken && _preToken.type == CONST.IDENTIFIER_TYPE) { //函数调用
                        stack.pop();
                        _preToken = _getPreToken(1);
                        if (_preToken && _preToken.value == 'function') { //函数声明
                            stack.pop();
                            if (!nextToken || nextToken.value != '{') {
                                _handleError(line, 'expected \'{\' after ' + _locate(token));
                                return;
                            }
                        }
                    } else if (_preToken && _preToken.value == 'function') { //匿名函数
                        stack.pop();
                        if (!nextToken || nextToken.value != '{') {
                            _handleError(line, 'expected \'{\' after ' + _locate(token));
                            return;
                        }
                    }
                    if (pre2Token && pre2Token.value == '(' && preToken.type == CONST.IDENTIFIER_TYPE) { //(a)，可继续将a当做IDENTIFIER_TYPE，使之可以a++
                        _token.type = CONST.IDENTIFIER_TYPE;
                    }
                    //处理结果作为新的标识符
                    _handleIndentifier(token.line, _token);
                } else { //前面缺少左括号
                    _handleError(line, 'unrecoverable ' + _locate(token));
                    return;
                }
            }
        }
        //处理大括号
        function _handleBraces(line, token) {
            if (startStrToken || startCommentToken || startRegToken) {
                return;
            }
            var nextToken = _getNextToken(token);
            var next2Token = nextToken && _getNextToken(nextToken);
            var preToken = _getPreToken(1);
            if (token.value == '{') {
                stack.push(token);
                if (nextToken && nextToken.value == '}' && (!preToken || preToken.type == CONST.BINARY_OP_TYPE)) { //空对象
                    startObjTokens.push(token);
                } else if (next2Token && next2Token.value == ',' || preToken && ['import', 'export'].indexOf(preToken.value) > -1) {
                    startDeconstruction = token;
                }
            } else {
                _handleSemicolon(line, token);
                preToken = _getPreToken(1);
                var startObj = startObjTokens[startObjTokens.length - 1];
                if (preToken == startDeconstruction) {
                    stack.pop();
                    startDeconstruction = null;
                    token = { //生成处理结果
                        type: CONST.RESULT_TYPE,
                        line: token.line,
                        originToken: token,
                        resultType: 'deconstruction'
                    }
                    _handleIndentifier(token.line, token);
                    return;
                } else if (preToken == startObj) { //对象字面量结束
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
                    preToken = _getPreToken(1);
                    if (preToken && ['for', 'while', 'switch'].indexOf(preToken.value) > -1) {
                        stack.pop();
                    }
                } else {
                    _handleError(line, 'unrecoverable ' + _locate(token));
                }
                if (!nextToken || nextToken.type != CONST.BINARY_OP_TYPE) {
                    _handleSemicolon(line, token);
                }
            }
        }
        //处理方括号
        function _handleBracekts(line, token) {
            if (startStrToken || startCommentToken || startRegToken) {
                return;
            }
            var preToken = _getPreToken(1);
            var pre2Token = _getPreToken(2);
            var nextToken = _getNextToken(token);
            if (token.value == ']') {
                if (!preToken || !pre2Token) {
                    _handleError(line, 'unrecoverable ' + _locate(token));
                    return;
                } else if (preToken.value != '[' && (!pre2Token || pre2Token.value != '[')) {
                    _handleError(line, 'unrecoverable ' + _locate(token));
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
            if (startStrToken || startCommentToken || startRegToken) {
                return;
            }
            var preToken = _getPreToken(1);
            var nextToken = _getNextToken(token);
            if ((token.value == '++' || token.value == '--')) {
                if (!preToken || preToken.value == ';' && (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE)) { //;++1
                    _handleError(line, 'expected identifier after ' + _locate(token));
                    return;
                } else {
                    preToken = _getPreToken(token);
                    if (preToken && preToken.type == CONST.IDENTIFIER_TYPE) {
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
            }
            stack.push(token);
        }
        //处理双目运算符
        function _handBinaryOp(line, token) {
            if (startStrToken || startCommentToken || startRegToken) {
                if (startRegToken && token.value == '/') {
                    startRegToken = null;
                    stack.pop();
                    token = {
                        type: CONST.RESULT_TYPE,
                        line: token.line,
                        originToken: token,
                        resultType: 'reg'
                    }
                    _handleIndentifier(line, token);
                }
                return;
            }
            var preToken = _getPreToken(1);
            var nextToken = _getNextToken(token);
            //双目运算符必须要有左运算符
            if (!preToken || [CONST.IDENTIFIER_TYPE, CONST.CONSTANT_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) == -1) {
                if (['+', '-', '/'].indexOf(token.value) == -1) { //+,-运算符也可以当作单目运算符
                    _handleError(token.line, 'expected left operand before ' + _locate(token));
                    return;
                } else if (token.value == '/') {
                    startRegToken = token;
                } else { //前缀单目运算符不入栈
                    return;
                }
            }
            if (token.value == '.') {
                if (!preToken || [CONST.IDENTIFIER_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) == -1) { //.符号前必须是标识符或表达式结果
                    _handleError(line, 'expected identifier before ' + _locate(token));
                    return;
                }
                if (!nextToken || [CONST.IDENTIFIER_TYPE, CONST.KEYWORD_TYPE].indexOf(nextToken.type) == -1) { //.符号后面必须是标识符
                    _handleError(line, 'expected identifier after ' + _locate(token));
                    return;
                }
                if (preToken && preToken.value == 'exports') { //exports 关键字转换成标识符
                    preToken.type = CONST.IDENTIFIER_TYPE;
                }
            }
            if (token.value == ',') {
                _handleEnd(line);
                return;
            }
            stack.push(token);
        }
        //处理三目运算符
        function _handTerNaryOp(line, token) {
            if (startStrToken || startCommentToken || startRegToken) {
                return;
            }
            var preToken = _getPreToken(1);
            var pre2Token = _getPreToken(2);
            var pre3Token = _getPreToken(3);
            var nextToken = _getNextToken(token);
            if (token.value == '?') {
                if (!preToken || [CONST.IDENTIFIER_TYPE, CONST.RESULT_TYPE, CONST.CONSTANT_TYPE].indexOf(preToken.type) == -1) {
                    _handleError(line, 'expected identifier before ' + _locate(token));
                    return;
                }
                if (!nextToken) {
                    _handleError(line, 'expected statement after ' + _locate(token));
                    return;
                }
            } else if (token.value == 'case') {
                _handleSemicolon(line, token); //清除之前的 case
                preToken = _getPreToken(1);
                pre2Token = _getPreToken(2);
                if (!(preToken && preToken.value == '{' && pre2Token && pre2Token.value == 'switch')) {
                    _handleError(line, 'unexpected ' + _locate(token));
                    return;
                }
                if (!nextToken) {
                    _handleError(line, 'expected statement after ' + _locate(token));
                    return;
                }
            } else if (token.value == ':') {
                if (!preToken || !pre2Token) {
                    _handleError(token.line, 'unexpected ' + _locate(token));
                    return;
                } else if (preToken.value == 'default') {
                    if (pre3Token && pre3Token.value != 'switch') {
                        _handleError(preToken.line, 'unexpected ' + _locate(preToken));
                        return;
                    }
                } else if (['{', 'case'].indexOf(pre2Token.value) == -1 && preToken.value != '?') {
                    _handleError(line, 'unexpected ' + _locate(token));
                    return;
                } else if (pre2Token.value == '{' && !(preToken.type == CONST.IDENTIFIER_TYPE || preToken.resultType == CONST.STRING_TYPE)) {
                    _handleError(line, 'expected identifier before ' + _locate(token));
                    return;
                } else if (pre2Token.value == 'case' && [CONST.IDENTIFIER_TYPE, CONST.CONSTANT_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) == -1) { //case 和 ? 语句后必须是表达式结果
                    _handleError(line, 'unexpected ' + _locate(token));
                    return;
                } else if (pre2Token.value == '{') {
                    if (pre3Token && pre3Token.value == 'switch' && pre2Token.value != 'case') {
                        _handleError(line, 'unexpected ' + _locate(token));
                        return;
                    } else {
                        startObjTokens.push(pre2Token);
                    }
                }
                if (!nextToken) {
                    _handleError(line, 'expected statement after ' + _locate(token));
                    return;
                }
            }
            stack.push(token);
        }
        //处理关键字
        function _handleKeyWord(line, token) {
            if (startStrToken || startCommentToken || startRegToken) {
                return;
            }
            var preToken = _getPreToken(1);
            var pre2Token = _getPreToken(2);
            var nextToken = _getNextToken(token);
            var next2Token = nextToken && _getNextToken(nextToken);
            if (token.value == 'static') {
                //static只能在方法前面
                if (!(nextToken && nextToken.type == CONST.IDENTIFIER_TYPE && next2Token && next2Token.value == '(')) {
                    _handleError(line, 'unexpected ' + _locate(token));
                    return;
                }
            } else if (token.value == 'new') {
                if (!(nextToken && [CONST.IDENTIFIER_TYPE, CONST.LEFT_PARENTHESES].indexOf(nextToken.type) > -1)) {
                    _handleError(line, 'unexpected ' + _locate(token));
                }
                return;
            } else if (token.value == 'function') {
                if (!(nextToken && [CONST.IDENTIFIER_TYPE, CONST.LEFT_PARENTHESES].indexOf(nextToken.type) > -1)) {
                    _handleError(line, 'unexpected ' + _locate(token));
                    return;
                }
            } else if (token.value == 'from') {
                if (!(preToken && (preToken.type == CONST.IDENTIFIER_TYPE || preToken.resultType == 'deconstruction') &&
                        nextToken && [CONST.SINGLE_QUOTATION_TYPE, CONST.DOUBLE_QUOTATION_TYPE].indexOf(nextToken.type) > -1)) {
                    _handleError(line, 'unexpected ' + _locate(token));
                    return;
                }
            } else if (token.value == 'extends') {
                if (!(preToken && preToken.type == CONST.IDENTIFIER_TYPE && nextToken && nextToken.type == CONST.IDENTIFIER_TYPE)) {
                    _handleError(line, 'unexpected ' + _locate(token));
                    return;
                }
            } else if (['if', 'else if', 'else', 'while', 'for', 'catch', 'with', 'switch'].indexOf(token.value) > -1) {
                if (token.value == 'else') { //其后必须跟表达式或语句
                    if (!nextToken) {
                        _handleError(line, 'expected statement after ' + _locate(token));
                        return;
                    }
                } else if (!nextToken || nextToken.value != '(') { //其后必须紧跟'('
                    _handleError(line, 'expected \'(\' after ' + _locate(token));
                    return;
                }
                if (['else', 'else if'].indexOf(token.value) > -1 && !(preToken && ['if', 'else if'].indexOf(preToken.value) > -1)) { //else 之前必须要有 if
                    _handleError(line, 'expected \'if\' before ' + _locate(token));
                    return;
                }
            } else if (['try', 'finally'].indexOf(token.value) > -1) {
                if (!nextToken || nextToken.value != '{') { //其后必须紧跟'{'
                    _handleError(line, 'expected \'{\' after ' + _locate(token));
                    return;
                }
                if (token.value == 'finally' && !(preToken && ['try', 'catch'].indexOf(preToken.value) > -1)) { //finally 之前必须要有 try,catch
                    _handleError(line, 'expected \'try\' before ' + _locate(token));
                    return;
                }
            } else if (token.value == 'catch' && !(preToken && preToken.value == 'try')) { //catch 之前必须要有 try
                _handleError(line, 'expected \'try\' before ' + _locate(token));
                return;
            } else if (preToken && [';', '{', '}', ':'].indexOf(preToken.value) == -1) { //关键字前面必须是界符
                var skip = false;
                if (token.value == 'var' && pre2Token.value == 'for') { //for 表达式中的 var 关键字比较特殊
                    if (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE) {
                        _handleError(line, 'expected \'in\' after ' + _locate(token));
                        return;
                    }
                    skip = true;
                } else if (preToken && preToken.value == '.') { //点运算符后面跟的关键字转换成标识符
                    token.type = CONST.IDENTIFIER_TYPE;
                    skip = true;
                } else if (token.value == 'default' && preToken.value == 'export') { //export default 特殊关键字
                    skip = true;
                }
                if (!skip) {
                    _handleError(line, 'expected statement before ' + _locate(token));
                    return;
                }
            } else if (['var', 'const', 'let', 'class', 'import', 'export'].indexOf(token.value) > -1 &&
                (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE)) { //关键字后面必须是变量
                var skip = false;
                //import,export后面可以跟解构表达式
                if (['import', 'export'].indexOf(token.value) > -1 && nextToken && (nextToken.value == '{')) {
                    skip = true;
                    //export default
                } else if (token.value == 'export' && nextToken && nextToken.value == 'default') {
                    skip = true;
                }
                if (!skip) {
                    _handleError(line, 'expected identifier after ' + _locate(token));
                }

            }
            stack.push(token);
        }
        //处理标识符
        function _handleIndentifier(line, token) {
            if (startStrToken || startCommentToken || startRegToken) {
                return;
            }
            if (startDeconstruction && token.type != CONST.IDENTIFIER_TYPE) {
                _handleError(startDeconstruction, 'unexpected ' + _locate(startDeconstruction));
                startDeconstruction = null;
                return;
            }
            var preToken = _getPreToken(1);
            var pre2Token = _getPreToken(2);
            var pre3Token = _getPreToken(3);
            var nextToken = _getNextToken(token);
            if (preToken) {
                if (preToken.resultType == 'reg') { //正则字面量
                    if (token.type == CONST.IDENTIFIER_TYPE && ['m', 'g', 'mg', 'gm'].indexOf(token.value) == -1) {
                        _handleError(line, 'unexpected ' + _locate(token));
                    }
                    return;
                }
                if (['try', 'catch', 'if', 'else if', '?'].indexOf(preToken.value) > -1 &&
                    nextToken && ['catch', 'finally', 'else if', 'else', ':'].indexOf(nextToken.value) > -1) { //流程控制语句未结束
                    return;
                }
                if ([CONST.IDENTIFIER_TYPE, CONST.CONSTANT_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) > -1) { //标识符之前还是标识符
                    _handleError(preToken.line, 'expected statement after ' + _locate(preToken));
                    return;
                }
                if (preToken.type == CONST.UNARY_OP_TYPE) {
                    if (token.type == CONST.RESULT_TYPE && preToken.value != '!') { //单目运算符，只有!后面可跟RESULT_TYPE
                        _handleError(line, 'expected identifier after ' + _locate(token));
                        return;
                    }
                    stack.pop();
                    preToken = _getPreToken(1);
                }
                if ([CONST.BINARY_OP_TYPE].indexOf(preToken.type) > -1) { //标识符之前是单目或双目运算符
                    var skip = false;
                    //如果标识符是函数或者前缀表达式或者后面运算符优先级较高，需要等待执行结果
                    if ((token.type == CONST.IDENTIFIER_TYPE && nextToken && (nextToken.value == '(') || ['++', '--'].indexOf(token.value) > -1) ||
                        (nextToken && nextToken.type == CONST.BINARY_OP_TYPE && (preToken.value.substr(-1) == '=' || ['||', '&&'].indexOf(preToken.value) > -1))) {
                        skip = true;
                    }
                    if (!skip) {
                        if (preToken.value == 'in') { //in 之后必须是标识符
                            if (token.type != CONST.IDENTIFIER_TYPE) {
                                _handleError(preToken.line, 'expected identifier after ' + _locate(preToken));
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
                    _handleError(token.line, 'expected statement after ' + _locate(token));
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
                        _handleError(token.line, 'expected \':\' after ' + _locate(token));
                        return;
                    }
                }
                //检测对象字面量尾部
                if (pre3Token && startObjTokens[startObjTokens.length - 1] == pre3Token && !nextToken) {
                    _handleError(token.line, 'expected \'}\' after ' + _locate(token));
                    return;
                }
            }
            stack.push(token);
        }
        //处理字符串
        function _handleString(line, token) {
            if (!startStrToken) {
                startStrToken = token;
            } else {
                var preToken = _getPreToken(token);
                var esCount = 0;
                while (preToken && preToken.value == '\\') {
                    esCount++;
                    preToken = _getPreToken(preToken);
                }
                if (startStrToken.type == token.type && !(esCount && esCount % 2 == 1)) {
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
        }
        //处理转义符
        function _handleEscape(line, token) {
            var nextToken = _getNextToken(token);
            if (!startStrToken && !startCommentToken && !startRegToken) {
                _handleError(token.line, 'expected \'\\\'');
                return;
            } else if (!nextToken) {
                if (startStrToken) {
                    _handleError(startStrToken.line, 'unclosed string ' + _locate(startStrToken));
                } else if (startRegToken) {
                    _handleError(startRegToken.line, 'unclosed reg ' + _locate(startRegToken));
                }
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
                    _handleError(token.line, 'unrecoverable ' + _locate(token));
                    return;
                }
                startCommentToken = null;
            }
        }
        //非法字符
        function _handleIllegal(line, token) {
            if (!startStrToken && !startCommentToken && !startRegToken) {
                _handleError(token.line, 'expected ' + _locate(token));
                return;
            }
        }
    }
}

export default JsParser;