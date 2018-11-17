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
        var stackIndex = Math.floor(firstLine / 100) - 1;
        var line = (stackIndex + 1) * 100 + 1;
        this.endLine = this.editor.linesContext.getLength();
        this.stack = this.stackHistory[stackIndex]; //操作栈
        if (!this.stack) {
            if (stackIndex > this.stackHistory.length - 1 && this.stackHistory.length) {
                line = this.stackHistory.length * 100 + 1;
                this.stack = this.stackHistory[this.stackHistory.length - 1];
            } else {
                line = 1;
                this.stack = [];
            }
        } else {
            this.stackHistory = this.stackHistory.slice(0, stackIndex + 1);
        }
        this.stack = Util.copyObj(this.stack);
        this.startObjTokens = this.stack.startObjTokens || []; //对象字面量
        this.startStrToken = this.stack.startStrToken; //字符串开始
        this.startLineComent = this.stack.startLineComent; //单行注释开始
        this.startCommentToken = this.stack.startCommentToken; //多行注释开始
        this.startRegToken = this.stack.startRegToken; //正则字面量
        this.startDeconstruction = this.stack.startDeconstruction; //es6解构表达式
        this.startClass = this.stack.startClass;
        this.skipToken = 0; //需要跳过的token数量
        clearTimeout(this.timer);
        this._startParse(line);
    }
    _startParse(line) {
        var self = this;
        var startTime = new Date().getTime();
        this.tokenizer.analysis(line); //分词
        while (line <= this.endLine && new Date().getTime() - startTime < 17) {
            //最少执行100次，防止频繁获取时间戳
            for (var count = 0; count < 100 && line <= this.endLine; count++) {
                this.tokenizer.analysis(line + 1); //下一行分词
                var tmp = line;
                while (tmp < this.endLine && !this.editor.linesContext.getTokens(++tmp)) {
                    this.tokenizer.analysis(tmp);
                }
                this.editor.linesContext.setError(line, '');
                var tokens = this.editor.linesContext.getTokens(line);
                for (var i = 0; i < tokens.length; i++) {
                    var token = tokens[i];
                    token.line = line;
                    this.skipToken = 0;
                    token = this._handleBefore(token);
                    if (!token) {
                        continue;
                    }
                    switch (token.type) {
                        case CONST.SEMICOLON_TYPE:
                            this._handleSemicolon(line, token);
                            break;
                        case CONST.KEYWORD_TYPE:
                            this._handleKeyWord(line, token);
                            break;
                        case CONST.PROCESS_TYPE:
                            this._handleProcess(line, token);
                            break;
                        case CONST.UNARY_OP_TYPE:
                            this._handleUnaryOp(line, token);
                            break;
                        case CONST.BINARY_OP_TYPE:
                            this._handBinaryOp(line, token);
                            break;
                        case CONST.TERNARY_OP_TYPE:
                            this._handTerNaryOp(line, token);
                            break;
                        case CONST.LEFT_PARENTHESES:
                        case CONST.RIGHT_PARENTHESES:
                            this._handleParentheses(line, token);
                            break;
                        case CONST.LEFT_BRACES:
                        case CONST.RIGHT_BRACES:
                            this._handleBraces(line, token);
                            break;
                        case CONST.LEFT_SQUARE_BRACKETS:
                        case CONST.RIGHT_SQUARE_BRACKETS:
                            this._handleBracekts(line, token);
                            break;
                        case CONST.IDENTIFIER_TYPE:
                        case CONST.CONSTANT_TYPE:
                            this._handleIndentifier(line, token);
                            break;
                        case CONST.SINGLE_QUOTATION_TYPE:
                        case CONST.DOUBLE_QUOTATION_TYPE:
                            this._handleString(line, token);
                            break;
                        case CONST.ESCAPE_TYPE:
                            this._handleEscape(line, token);
                            break;
                        case CONST.LINE_COMMENT_TYPE:
                            this._handleLineComment(line, token);
                            break;
                        case CONST.START_COMMENT_TYPE:
                        case CONST.END_COMMENT_TYPE:
                            this._handleComment(line, token);
                            break;
                        case CONST.ILLEGAL_TYPE:
                            this._handleIllegal(line, token);
                            break;
                    }
                    i += this.skipToken;
                }
                this._handleEnd(line);
                this._storeStack(line);
                line++;
            }
        }
        if (line > this.endLine) {
            this._handleEnd(this.endLine, true);
        } else {
            this.timer = setTimeout(function() {
                self._startParse(line);
            });
        }
    }
    /**
     * 处理token之前的情况
     * @param  {Token} token   令牌对象
     * @return {Boolean}       是否跳过token
     */
    _handleBefore(token) {
        if (token.value == '*/') {
            if (!this.startCommentToken) { //分解成*,/
                var tokens = this.editor.linesContext.getTokens(token.line);
                var index = tokens.indexOf(token);
                token = {
                    line: token.line,
                    value: '*',
                    start: token.start,
                    type: CONST.BINARY_OP_TYPE
                }
                tokens.splice(index, token);
                token = {
                    line: token.line,
                    value: '/',
                    start: token.start + 1,
                    type: CONST.BINARY_OP_TYPE
                }
                tokens.splice(index + 1, token);
            }
        } else if (token.value == '//') {
            if (this.startRegToken) { //分解成/,/
                var tokens = this.editor.linesContext.getTokens(token.line);
                var index = tokens.indexOf(token);
                token = {
                    line: token.line,
                    value: '/',
                    start: token.start,
                    type: CONST.BINARY_OP_TYPE
                }
                tokens.splice(index, token);
                token = {
                    line: token.line,
                    value: '/',
                    start: token.start + 1,
                    type: CONST.BINARY_OP_TYPE
                }
                tokens.splice(index + 1, token);
            }
        }
        if (this.startStrToken) { //字符串
            if (token.value != this.startStrToken.value) {
                return false;
            }
        } else if (this.startLineComent) { //单行注释
            return false;
        } else if (this.startCommentToken) { //多行注释
            if (token.type != CONST.END_COMMENT_TYPE) {
                return false;
            }
        } else if (this.startRegToken) { //正则表达式
            if (token.value != '/') {
                return false;
            }
        }
        return token;
    }
    //获取前一个token
    _getPreToken(distance) {
        if (typeof distance == 'number') {
            return this.stack[this.stack.length - distance];
        } else {
            var token = distance.originToken || distance;
            var line = token.line;
            var tokens = this.editor.linesContext.getTokens(line);
            var index = tokens.indexOf(token) - 1;
            while (line >= 1) {
                if (index >= 0) {
                    return tokens[index];
                } else {
                    tokens = this.editor.linesContext.getTokens(--line);
                    index = tokens.length - 1;
                }
            }
            return null;
        }
    }
    //获取下一个token
    _getNextToken(token) {
        token = token.originToken || token;
        var line = token.line;
        var tokens = this.editor.linesContext.getTokens(line);
        var index = tokens.indexOf(token) + 1;
        while (line <= this.endLine) {
            if (index < tokens.length) {
                tokens[index].line = line;
                return tokens[index];
            } else {
                tokens = this.editor.linesContext.getTokens(++line);
                index = 0;
            }
        }
        return null;
    }
    //抛出token
    _popUntil(token) {
        if (token) { //抛出stack中的token以及token之后的所有对象
            while (this.stack.length) {
                var _token = this.stack.pop();
                if (_token == token) {
                    break;
                }
            }
        } else { //抛出stack中的对象，直到遇到边界符号
            var preToken = this._getPreToken(1);
            if (preToken && !this._getNextToken(preToken)) { //已经分析结束了，不再抛出
                return;
            }
            while (this.stack.length) {
                var _token = this.stack[this.stack.length - 1];
                if (_token.type < CONST.LEFT_PARENTHESES || _token.type > CONST.RIGHT_BRACES) {
                    this.stack.pop();
                } else {
                    break;
                }
            }
        }
    }
    //处理错误行
    _handleError(line, error) {
        if (!this.editor.linesContext.getError(line)) {
            this.editor.linesContext.setError(line, error);
        }
        this._popUntil();
    }
    //存储执行结果
    _storeStack(line) {
        if (line % 100 == 0) {
            this.stackHistory[line / 100 - 1] = [];
            var arr = this.stackHistory[line / 100 - 1];
            for (var i = 0, length = this.stack.length; i < length; i++) {
                arr.push(this.stack[i]);
            }
            arr.startStrToken = this.startStrToken;
            arr.startRegToken = this.startRegToken;
            arr.startLineComent = this.startLineComent;
            arr.startCommentToken = this.startCommentToken;
            arr.startObjTokens = this.startObjTokens;
            arr.startClass = this.startClass;
        }
    }
    //获取token位置
    _locate(token) {
        token = token.originToken || token;
        return '\'' + token.value + '\' (col:' + (token.start + 1) + ')'
    }
    //行尾处理
    _handleEnd(line, ifOver, token) {
        var preToken = this._getPreToken(1);
        var pre2Token = this._getPreToken(2);
        if (this.startStrToken) { //多行字符串为结束
            if (ifOver) {
                this._handleError(this.startStrToken.line, 'unclosed string ' + this._locate(this.startStrToken));
            }
            return;
        }
        if (this.startRegToken) { //正则字面量未结束
            this._handleError(this.startRegToken.line, 'unclosed reg ' + this._locate(this.startRegToken));
            this.startRegToken = null;
            return;
        }
        if (this.startLineComent) {
            this._popUntil(this.startLineComent);
        }
        if (preToken && ifOver) { //非正常结束
            //以下关键字后面必须有表达式
            if (['try', 'catch', 'if', 'else if', '?', ':', 'for', 'while'].indexOf(preToken.value) > -1) {
                this._handleError(preToken.line, 'expected statement after ' + this._locate(preToken));
                return;
                //运算符必须要有右运算符
            } else if ([CONST.UNARY_OP_TYPE, CONST.BINARY_OP_TYPE, CONST.TERNARY_OP_TYPE].indexOf(preToken.type) > -1) {
                this._handleError(preToken.line, 'expected right operand after ' + this._locate(preToken));
                return;
            } else if ([CONST.KEYWORD_TYPE, CONST.PROCESS_TYPE].indexOf(preToken.type) > -1) {
                this._handleError(preToken.line, 'unexpected ' + this._locate(preToken));
                return;
            }
        }
        var nextToken = token && this._getNextToken(token);
        //尾部是否可以清空(与下一行没有关联)
        if (!(preToken && [CONST.BINARY_OP_TYPE, CONST.TERNARY_OP_TYPE, CONST.KEYWORD_TYPE].indexOf(preToken.type) > -1) && //上一行尾部有双目或三目运算符或关键字
            !(preToken && preToken.type == CONST.IDENTIFIER_TYPE && nextToken && ['++', '--'].indexOf(nextToken.value) > -1) && //下一行头部有依赖上一行的单目运算符
            !(nextToken && [CONST.BINARY_OP_TYPE, CONST.TERNARY_OP_TYPE].indexOf(nextToken.type) > -1) && //下一行头部有双目或三目运算符号
            !(preToken && ['try', 'catch', 'if', 'else if', '?'].indexOf(preToken.value) > -1 && //上一行结构语句未结束
                nextToken && ['catch', 'finally', 'else if', 'else', ':'].indexOf(nextToken.value) > -1)) {
            while (this.stack.length > 0) { //清空表达式
                var _token = this.stack[this.stack.length - 1];
                if (_token.type < CONST.LEFT_PARENTHESES || _token.type > CONST.RIGHT_BRACES) {
                    this.stack.pop();
                } else {
                    break;
                }
            }
        }
        if (preToken && ifOver) {
            if (['(', '{', '['].indexOf(preToken.value) > -1) { //边界符未配对
                this._handleError(preToken.line, 'unmatched ' + this._locate(preToken));
            }
        }
    }
    //抛出整行界符之后的操作数和操作符
    _handleSemicolon(line, token) {
        var preToken = this._getPreToken(1);
        var nextToken = this._getNextToken(token);
        //运算符之后没有操作数
        if (preToken && [CONST.UNARY_OP_TYPE, CONST.BINARY_OP_TYPE, CONST.TERNARY_OP_TYPE].indexOf(preToken.type) > -1) {
            this._handleError(preToken.line, 'unexpected statement after ' + this._locate(preToken));
            //流程控制语句未结束
        } else if (preToken && ['try', 'catch', 'if', 'else if', '?'].indexOf(preToken.value) > -1 &&
            nextToken && ['catch', 'finally', 'else if', 'else', ':'].indexOf(nextToken.value) > -1) {
            return;
        }
        while (this.stack.length > 0) { //清空表达式
            var _token = this.stack[this.stack.length - 1];
            if ([';'].indexOf(_token.value) == -1 && (_token.type < CONST.LEFT_PARENTHESES || _token.type > CONST.RIGHT_BRACES)) {
                this.stack.pop();
            } else {
                if (['['].indexOf(_token.value) > -1) { //数组内有语句
                    this._handleError(_token.line, 'unexpected ' + this._locate(_token));
                    return;
                }
                break;
            }
        }
        preToken = this._getPreToken(1);
        var pre2Token = this._getPreToken(2);
        //加入;用于验证for表达式
        if (preToken && (preToken.value == ';' || preToken.value == '(' && pre2Token && pre2Token.value == 'for')) {
            //for循环括号最多只能有3个表达式
            if (this.stack[this.stack.length - 2] && this.stack[this.stack.length - 2].value == ';') {
                this._handleError(preToken.line, 'expected \')\' after ' + this._locate(preToken));
            } else {
                this.stack.push(token);
            }
            //对象字面量声明内有语句
        } else if (this.startObjTokens.indexOf(preToken) > -1) {
            this._handleError(preToken.line, 'unexpected ' + this._locate(token));
            //解构表达式里有语句
        } else if (this.startDeconstruction && this.startDeconstruction == preToken) {
            this._handleError(preToken.line, 'unexpected ' + this._locate(preToken));
        }
    }
    //处理圆括号
    _handleParentheses(line, token) {
        var preToken = this._getPreToken(1);
        var pre2Token = this._getPreToken(2);
        var pre3Token = this._getPreToken(3);
        var nextToken = this._getNextToken(token);
        if (token.value == '(') {
            if (nextToken.value == ')' && preToken.type != CONST.IDENTIFIER_TYPE && preToken.value != 'function') { //空()
                this._handleError(preToken.line, 'expected expression after ' + this._locate(preToken));
                this.skipToken = 1;
                return;
            }
            this.stack.push(token);
        } else if (preToken) {
            if (preToken.value == ';' || pre2Token && pre2Token.value == ';') { //for循环表达式
                if (preToken.value != ';') {
                    this.stack.pop();
                }
                pre2Token = this._getPreToken(2)
                if (!pre2Token || pre2Token.value != ';') { //for圆括号内内必须有三个表达式
                    this._handleError(preToken.line, 'expected statement after ' + this._locate(preToken));
                    return;
                }
                this.stack.splice(this.stack.length - 4, 4);
                return;
            } else if (pre2Token && pre2Token.value == 'var') { //for in 表达式
                this.stack.splice(this.stack.length - 4, 4);
                return;
            } else if (preToken.value == '(' || pre2Token && pre2Token.value == '(') { //圆括号匹配正确
                //')'后面必须跟块语句
                if (pre3Token && ['catch', 'with', 'switch'].indexOf(pre3Token.value) > -1 && (!nextToken || nextToken.value != '{')) {
                    this._handleError(line, 'expected \'{\' after ' + this._locate(token));
                    return;
                }
            } else {
                this._handleError(line, 'unmatched ' + this._locate(token));
                return;
            }
            this.stack.pop();
            if (preToken.value != '(') {
                this.stack.pop();
            }
            token = { //生成处理结果
                type: preToken.type == CONST.IDENTIFIER_TYPE ? CONST.IDENTIFIER_TYPE : CONST.RESULT_TYPE,
                line: token.line,
                originToken: token
            }
            preToken = this._getPreToken(1);
            //如果是以下流程控制关键字，直接返回
            if (preToken && ['if', 'else if', 'catch', '?', 'switch'].indexOf(preToken.value) > -1) {
                return;
            }
            if (preToken && preToken.type == CONST.IDENTIFIER_TYPE) { //函数调用
                this.stack.pop();
                preToken = this._getPreToken(1);
                if (preToken && preToken.value == 'function') { //函数声明
                    this.stack.pop();
                    if (!nextToken || nextToken.value != '{') {
                        this._handleError(line, 'expected \'{\' after ' + this._locate(token));
                        return;
                    }
                }
            } else if (preToken && preToken.value == 'function') { //匿名函数
                this.stack.pop();
                if (!nextToken || nextToken.value != '{') {
                    this._handleError(line, 'expected \'{\' after ' + this._locate(token));
                    return;
                }
            }
            //处理结果作为新的标识符
            this._handleIndentifier(token.line, token);
        } else { //前面缺少左括号
            this._handleError(line, 'unmatched ' + this._locate(token));
            return;
        }
    }
    //处理大括号
    _handleBraces(line, token) {
        var nextToken = this._getNextToken(token);
        var next2Token = nextToken && this._getNextToken(nextToken);
        var preToken = this._getPreToken(1);
        var pre2Token = this._getPreToken(2);
        if (token.value == '{') {
            this.stack.push(token);
            if (nextToken && nextToken.value == '}' && (!preToken || preToken.type == CONST.BINARY_OP_TYPE)) { //空对象
                this.startObjTokens.push(token);
            } else if (next2Token && next2Token.value == ',') { //解构表达式
                this.startDeconstruction = token;
            } else if (pre2Token && ['class', 'extends'].indexOf(pre2Token.value) > -1) { //类开始
                this.startClass = token;
            }
        } else {
            this._popUntil();
            preToken = this._getPreToken(1);
            var startObj = this.startObjTokens[this.startObjTokens.length - 1];
            if (preToken == this.startDeconstruction) { //解构表达式结束
                this.stack.pop();
                this.startDeconstruction = null;
                token = { //生成处理结果
                    type: CONST.RESULT_TYPE,
                    line: token.line,
                    originToken: token,
                    resultType: 'deconstruction'
                }
                this._handleIndentifier(token.line, token);
                return;
            } else if (preToken == startObj) { //对象字面量结束
                this.stack.pop();
                this.startObjTokens.pop();
                token = { //生成处理结果
                    type: CONST.RESULT_TYPE,
                    line: token.line,
                    originToken: token
                }
                this._handleIndentifier(token.line, token);
            } else if (preToken && preToken.value == '{') { //语句块结束
                this.stack.pop();
                this._handleEnd(line, false, token);
            } else {
                this._handleError(line, 'unmatched ' + this._locate(token));
            }
        }
    }
    //处理方括号
    _handleBracekts(line, token) {
        var preToken = this._getPreToken(1);
        var pre2Token = this._getPreToken(2);
        var nextToken = this._getNextToken(token);
        if (token.value == ']') {
            if (!(preToken && preToken.value == '[' || pre2Token && pre2Token.value == '[')) {
                this._handleError(line, 'unmatched ' + this._locate(token));
                return;
            }
            this.stack.pop();
            if (preToken.value != '[') {
                this.stack.pop();
            }
            token = { //生成处理结果
                type: CONST.RESULT_TYPE,
                line: token.line,
                originToken: token
            }
            this._handleIndentifier(line, token);
        } else {
            //数组或者对象名称
            if (preToken && [CONST.RESULT_TYPE, CONST.IDENTIFIER_TYPE].indexOf(preToken.type) > -1) {
                this.stack.pop();
            }
            this.stack.push(token);
        }
    }
    //处理单目运算符
    _handleUnaryOp(line, token) {
        var preToken = this._getPreToken(token);
        var nextToken = this._getNextToken(token);
        var next2Token = nextToken && this._getNextToken(nextToken);
        if ((token.value == '++' || token.value == '--')) {
            //++,--必须跟着标识符
            if (!(preToken && preToken.type == CONST.IDENTIFIER_TYPE ||
                    nextToken && nextToken.type == CONST.IDENTIFIER_TYPE)) {
                this._handleError(line, 'expected identifier after ' + this._locate(token));
                return;
                //标示符号前后不能同时有++,--
            } else if (nextToken && nextToken.type == CONST.IDENTIFIER_TYPE &&
                next2Token && ['++', '--'].indexOf(next2Token) > -1) {
                this._handleError(nextToken.line, 'unexpected ' + this._locate(nextToken));
                this.skipToken = 2;
                return;
            } else if (preToken && preToken.type == CONST.IDENTIFIER_TYPE) { //后缀运算符
                this.stack.pop();
                token = { //生成处理结果
                    line: token.line,
                    type: CONST.RESULT_TYPE,
                    originToken: token
                }
                this._handleIndentifier(line, token);
                return;
            }
        }
        this.stack.push(token);
    }
    //处理双目运算符
    _handBinaryOp(line, token) {
        if (this.startRegToken && token.value == '/') {
            var preToken = this._getPreToken(token);
            var sum = 0;
            while (preToken && preToken.value == '\\') {
                preToken = this._getPreToken(preToken);
                sum++;
            }
            if (sum % 2 == 1) { //排除转义符
                return;
            }
            this.startRegToken = null;
            this.stack.pop();
            token = {
                type: CONST.RESULT_TYPE,
                line: token.line,
                originToken: token,
                resultType: 'reg'
            }
            this._handleIndentifier(line, token);
            return;
        }
        var preToken = this._getPreToken(1);
        var nextToken = this._getNextToken(token);
        //双目运算符必须要有左运算符
        if (!preToken || [CONST.IDENTIFIER_TYPE, CONST.CONSTANT_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) == -1) {
            if (['+', '-', '/'].indexOf(token.value) == -1) { //+,-运算符也可以当作单目运算符
                this._handleError(token.line, 'expected left operand before ' + this._locate(token));
                return;
            }
            if (token.value == '/') {
                this.startRegToken = token;
            } else { //前缀单目运算符不入栈
                return;
            }
        }
        if (token.value == 'in') {
            //in符号前必须是标识符
            if (!preToken || preToken.type != CONST.IDENTIFIER_TYPE) {
                this._handleError(line, 'expected identifier before ' + this._locate(token));
                return;
            }
            //in符号后面必须是标识符
            if (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE) {
                this._handleError(line, 'expected identifier after ' + this._locate(token));
                return;
            }
        } else if (token.value == '.') {
            //.符号前必须是标识符或表达式结果
            if (!preToken || [CONST.IDENTIFIER_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) == -1) {
                this._handleError(line, 'expected identifier before ' + this._locate(token));
                return;
            }
            //.符号后面必须是标识符
            if (!nextToken || [CONST.IDENTIFIER_TYPE, CONST.KEYWORD_TYPE, CONST.PROCESS_TYPE].indexOf(nextToken.type) == -1) {
                this._handleError(line, 'expected identifier after ' + this._locate(token));
                return;
            }
        } else if (token.value == ',') {
            this._popUntil();
            return;
        }
        this.stack.push(token);
    }
    //处理三目运算符
    _handTerNaryOp(line, token) {
        var preToken = this._getPreToken(1);
        var pre2Token = this._getPreToken(2);
        var pre3Token = this._getPreToken(3);
        var nextToken = this._getNextToken(token);
        if (token.value == '?') {
            //?之后必须要有表达式结果
            if (!preToken || [CONST.IDENTIFIER_TYPE, CONST.RESULT_TYPE, CONST.CONSTANT_TYPE].indexOf(preToken.type) == -1) {
                this._handleError(line, 'expected identifier before ' + this._locate(token));
                return;
            }
        } else if (token.value == 'case') {
            this._popUntil(); //清除之前的 case
            preToken = this._getPreToken(1);
            pre2Token = this._getPreToken(2);
            //case 之前必须是 switch{
            if (!(preToken && preToken.value == '{' && pre2Token && pre2Token.value == 'switch')) {
                this._handleError(line, 'unexpected ' + this._locate(token));
                return;
            }
        } else if (token.value == ':') {
            if (!preToken || !pre2Token) {
                this._handleError(token.line, 'unexpected ' + this._locate(token));
                return;
                //':'之前必须是对象或者 switch 语句或者三目运算符
            } else if (['{', 'case'].indexOf(pre2Token.value) == -1 && preToken.value != '?') {
                this._handleError(line, 'unexpected ' + this._locate(token));
                return;
            } else if (preToken.value == 'default') {
                //default 之前必须是 switch{
                if (pre3Token && pre3Token.value != 'switch') {
                    this._handleError(preToken.line, 'unexpected ' + this._locate(preToken));
                    return;
                }
                //':'之前是对象,但是key不合法
            } else if (pre2Token.value == '{' && !(preToken.type == CONST.IDENTIFIER_TYPE || preToken.resultType == CONST.STRING_TYPE)) {
                this._handleError(line, 'expected identifier before ' + this._locate(token));
                return;
                //':'之前是switch语句,但是条件表达式不合法
            } else if (pre2Token.value == 'case' && [CONST.IDENTIFIER_TYPE, CONST.CONSTANT_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) == -1) { //case 和 ? 语句后必须是表达式结果
                this._handleError(line, 'unexpected ' + this._locate(token));
                return;
                //对象字面量
            } else if (pre2Token.value == '{' && pre3Token && pre3Token.value != 'switch') {
                this.startObjTokens.push(pre2Token);
            }
        }
        this.stack.push(token);
    }
    //处理关键字
    _handleKeyWord(line, token) {
        var preToken = this._getPreToken(1);
        var pre2Token = this._getPreToken(2);
        var nextToken = this._getNextToken(token);
        var next2Token = nextToken && this._getNextToken(nextToken);
        if (token.value == 'static') {
            //static只能在方法前面
            if (!(nextToken && nextToken.type == CONST.IDENTIFIER_TYPE && next2Token && next2Token.value == '(')) {
                this._handleError(line, 'unexpected ' + this._locate(token));
                return;
            }
        } else if (token.value == 'new') {
            //new A(),new (A)
            if (!(nextToken && [CONST.IDENTIFIER_TYPE, CONST.LEFT_PARENTHESES].indexOf(nextToken.type) > -1)) {
                this._handleError(line, 'unexpected ' + this._locate(token));
            }
            return;
        } else if (token.value == 'function') {
            //function a(){},function (){}
            if (!(nextToken && [CONST.IDENTIFIER_TYPE, CONST.LEFT_PARENTHESES].indexOf(nextToken.type) > -1)) {
                this._handleError(line, 'unexpected ' + this._locate(token));
                return;
            }
        } else if (token.value == 'from') {
            //import a,import {a,b}
            if (!(preToken && (preToken.type == CONST.IDENTIFIER_TYPE || preToken.resultType == 'deconstruction') &&
                    nextToken && [CONST.SINGLE_QUOTATION_TYPE, CONST.DOUBLE_QUOTATION_TYPE].indexOf(nextToken.type) > -1)) {
                this._handleError(line, 'unexpected ' + this._locate(token));
                return;
            }
        } else if (token.value == 'extends') {
            //class A extends B
            if (!(pre2Token && pre2Token.value == 'class' && nextToken && nextToken.type == CONST.IDENTIFIER_TYPE)) {
                this._handleError(line, 'unexpected ' + this._locate(token));
                return;
            }
        } else if (preToken && [';', '{', '}', ':'].indexOf(preToken.value) == -1) { //关键字前面必须是界符
            var skip = false;
            if (token.value == 'var' && pre2Token.value == 'for') { //for 表达式中的 var 关键字比较特殊
                if (!nextToken || nextToken.type != CONST.IDENTIFIER_TYPE) {
                    this._handleError(line, 'expected \'in\' after ' + this._locate(token));
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
                this._handleError(line, 'expected statement before ' + this._locate(token));
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
                this._handleError(line, 'expected identifier after ' + this._locate(token));
            }

        }
        this.stack.push(token);
    }
    _handleProcess(line, token) {
        var preToken = this._getPreToken(1);
        var nextToken = this._getNextToken(token);
        if (['if', 'else if', 'else', 'while', 'for', 'catch', 'with', 'switch'].indexOf(token.value) > -1) {
            if (token.value == 'else') { //其后必须跟表达式或语句
                if (!nextToken) {
                    this._handleError(line, 'expected statement after ' + this._locate(token));
                    return;
                }
            } else if (!nextToken || nextToken.value != '(') { //其后必须紧跟'('
                this._handleError(line, 'expected \'(\' after ' + this._locate(token));
                return;
            }

            if (token.value == 'catch') {
                //catch 之前必须要有 try
                if (!(preToken && preToken.value == 'try')) {
                    this._handleError(line, 'expected \'try\' before ' + this._locate(token));
                    return;
                }
            } else if (['else', 'else if'].indexOf(token.value) > -1) {
                //else 之前必须要有 if
                if (!(preToken && ['if', 'else if'].indexOf(preToken.value) > -1)) {
                    this._handleError(line, 'expected \'if\' before ' + this._locate(token));
                    return;
                }
            }
        } else if (['try', 'finally'].indexOf(token.value) > -1) {
            if (!nextToken || nextToken.value != '{') { //其后必须紧跟'{'
                this._handleError(line, 'expected \'{\' after ' + this._locate(token));
                return;
            }
            //finally 之前必须要有 try,catch
            if (token.value == 'finally' && !(preToken && ['try', 'catch'].indexOf(preToken.value) > -1)) {
                this._handleError(line, 'expected \'try\' before ' + this._locate(token));
                return;
            }
        }
        this.stack.push(token);
    }
    //处理标识符
    _handleIndentifier(line, token) {
        if (this.startDeconstruction && token.type != CONST.IDENTIFIER_TYPE) {
            this._handleError(this.startDeconstruction.line, 'unexpected ' + this._locate(this.startDeconstruction));
            this.startDeconstruction = null;
            return;
        }
        var preToken = this._getPreToken(1);
        var pre2Token = this._getPreToken(2);
        var pre3Token = this._getPreToken(3);
        var nextToken = this._getNextToken(token);
        if (!preToken) {
            this.stack.push(token);
            return;
        }
        //流程控制语句未结束
        if (['try', 'catch', 'if', 'else if', '?'].indexOf(preToken.value) > -1 &&
            nextToken && ['catch', 'finally', 'else if', 'else', ':'].indexOf(nextToken.value) > -1) {
            return;
        }
        if (preToken.resultType == 'reg') {
            //正则字面量后面不能跟标识符
            if (token.type == CONST.IDENTIFIER_TYPE && ['m', 'g', 'mg', 'gm'].indexOf(token.value) == -1) {
                this._handleError(line, 'unexpected ' + this._locate(token));
            }
            return;
        }
        //标识符之前还是标识符
        if ([CONST.IDENTIFIER_TYPE, CONST.CONSTANT_TYPE, CONST.RESULT_TYPE].indexOf(preToken.type) > -1) {
            this._handleError(preToken.line, 'expected statement after ' + this._locate(preToken));
            return;
        }
        //标识符之前是单目运算符
        if (preToken.type == CONST.UNARY_OP_TYPE) {
            //单目运算符，只有!后面可跟RESULT_TYPE
            if (token.type == CONST.RESULT_TYPE && preToken.value != '!') {
                this._handleError(line, 'expected identifier after ' + this._locate(token));
                return;
            }
            this.stack.pop();
            token = { //生成处理结果
                type: CONST.RESULT_TYPE,
                line: line,
                originToken: token.originToken || token
            }
            this._handleIndentifier(line, token);
            return;
        }
        //标识符之前是双目运算符
        if (preToken.type == CONST.BINARY_OP_TYPE) {
            var skip = false;
            //如果标识符是函数，需要等待执行结果
            if (token.type == CONST.IDENTIFIER_TYPE && nextToken && nextToken.value == '(') {
                skip = true;
                //如果有后缀运算符，需要等待执行结果
            } else if (nextToken && ['++', '--'].indexOf(nextToken.value) > -1) {
                skip = true;
                //如果前面运算符优先级较低，需要等待执行结果
            } else if (nextToken && nextToken.type == CONST.BINARY_OP_TYPE &&
                (['&&', '||', '>', '<'].indexOf(preToken.value) > -1 || preToken.value.indexOf('=') > -1)) {
                skip = true;
            }
            if (!skip) {
                this.stack.pop();
                if (preToken.type == CONST.BINARY_OP_TYPE) {
                    this.stack.pop();
                }
                token = { //生成处理结果
                    type: CONST.RESULT_TYPE,
                    line: line,
                    originToken: token.originToken || token
                }
                this._handleIndentifier(line, token);
                return;
            }
        }
        if (preToken.value == ':' && pre2Token && pre2Token.value == '?') {
            //三目运算符结束
            if (!(nextToken && nextToken.type == CONST.BINARY_OP_TYPE && ['++', '--'].indexOf(nextToken.value) == -1)) {
                this.stack.splice(this.stack.length - 3, 3);
                token = { //生成处理结果
                    type: CONST.RESULT_TYPE,
                    line: line,
                    originToken: token.originToken || token
                }
                this._handleIndentifier(line, token);
                return;
            }
        }
        //检测对象字面量关键字
        if ((token.type == CONST.IDENTIFIER_TYPE || token.resultType == CONST.STRING_TYPE) && this.startObjTokens[this.startObjTokens.length - 1] == preToken) {
            if (!nextToken || nextToken.value != ':') {
                this._handleError(token.line, 'expected \':\' after ' + this._locate(token));
                return;
            }
        }
        //检测对象字面量尾部
        if (pre3Token && this.startObjTokens[this.startObjTokens.length - 1] == pre3Token && !nextToken) {
            this._handleError(token.line, 'expected \'}\' after ' + this._locate(token));
            return;
        }
        this.stack.push(token);
    }
    //处理字符串
    _handleString(line, token) {
        if (!this.startStrToken) {
            this.startStrToken = token;
        } else {
            var preToken = this._getPreToken(token);
            var esCount = 0;
            while (preToken && preToken.value == '\\') { //排除转义符
                esCount++;
                preToken = this._getPreToken(preToken);
            }
            //字符串结束
            if (this.startStrToken.type == token.type && !(esCount && esCount % 2 == 1)) {
                this.startStrToken = null;
                token = { //生成处理结果
                    type: CONST.RESULT_TYPE,
                    line: token.line,
                    originToken: token,
                    resultType: CONST.STRING_TYPE
                }
                this._handleIndentifier(token.line, token);
            }
        }
    }
    //处理单行注释
    _handleLineComment(line, token) {
        if (!this.startLineComent) {
            this.startLineComent = token;
        }
    }
    //处理多行注释
    _handleComment(line, token) {
        if (token.value == '/*' && !this.startCommentToken) {
            this.startCommentToken = token;
        } else if (token.value == '*/') {
            if (!this.startCommentToken) {
                this._handleError(token.line, 'unrecoverable ' + this._locate(token));
                return;
            }
            this.startCommentToken = null;
        }
    }
    //处理转义符
    _handleEscape(line, token) {
        this._handleError(token.line, 'expected \'\\\'');
        return;
    }
    //非法字符
    _handleIllegal(line, token) {
        this._handleError(token.line, 'expected ' + this._locate(token));
        return;
    }
}

export default JsParser;