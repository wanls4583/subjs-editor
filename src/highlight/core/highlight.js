/*
 * @Author: lisong
 * @Date: 2020-11-11 14:32:45
 * @Description: 
 */
import Util from '../../common/util';
import {
    rules,
    pairRules,
    seniorRules
} from '../javascript/rules';
import PairLink from './pair-link';
class Highlight {
    constructor(lineContext, option) {
        this.rules = option.rules || rules;
        this.seniorRules = option.seniorRules || seniorRules;
        this.pairRules = [];
        this.pairLink = new PairLink(lineContext);
        this.lineContext = lineContext;
        //处理多行匹配
        (option.pairRules || pairRules).map((item) => {
            var startRegStr = String(item.startReg);
            var endRegStr = String(item.endReg);
            var type = startRegStr + '-->' + endRegStr;
            var startRule = {
                reg: item.startReg,
                className: item.className,
                excludeRegs: item.startExcludeRegs,
                type: type,
            };
            var endRule = {
                reg: item.endReg,
                className: item.className,
                excludeRegs: item.endExcludeRegs,
                type: type,
            };
            this.pairRules.push(startRule);
            if (startRegStr == endRegStr) {
                startRule.role = Util.constData.PAIR_START_END;
                endRule.role = Util.constData.PAIR_START_END;
            } else {
                startRule.role = Util.constData.PAIR_START;
                endRule.role = Util.constData.PAIR_END;
                this.pairRules.push(endRule);
            }
        });
        this.seniorRules.map((item) => {
            item.level = item.level || 0;
            item.level += Util.constData.SENIOR_LEVEL;
        });
    }
    /**
     * 匹配token
     * @param {String} text 
     * @param {Array} rules 规则
     * @returns {Array}
     */
    _getTokens(text, rules) {
        var length = rules.length;
        var tokens = [];
        var excludeTokens = []; //需要排除的区域
        var result = null;
        //单行大于100000个字符，则略过
        if (text.length > 100000) {
            return [];
        }
        for (var i = 0; i < length; i++) {
            var rule = rules[i];
            excludeTokens = [];
            //获取需要排除的区域
            rule.excludeRegs && rule.excludeRegs.map((excludeReg) => {
                result = excludeReg.exec(text);
                while (result) {
                    var index = result.index;
                    index += result[0].indexOf(result[result.length - 1]);
                    excludeTokens.push({
                        start: index,
                        end: index + result[result.length - 1].length,
                    });
                    result = excludeReg.exec(text);
                    if (!excludeReg.global) {
                        break;
                    }
                }
            });
            //获取token
            result = rule.reg.exec(text);
            while (result) {
                var index = result.index;
                index += result[0].indexOf(result[result.length - 1]);
                var token = {
                    start: index,
                    end: index + result[result.length - 1].length,
                    className: rule.className,
                    level: rule.level,
                    type: rule.type,
                    role: rule.role,
                };
                if (_checkToken(token, excludeTokens)) {
                    tokens.push(token);
                }
                result = rule.reg.exec(text);
                if (!rule.reg.global) {
                    break;
                }
            }
        }
        //token排序
        tokens.sort((a, b) => {
            //按优先级排序
            var n = b.level - a.level;
            if (n == 0) {
                //按在字符串中的位置排序
                return a.start - b.start;
            }
            return n;
        });
        //删除无效token
        tokens.map((token, index) => {
            if (index == 0) {
                return;
            }
            for (var i = index - 1; i >= 0; i--) {
                var _token = tokens[i];
                if (!_token.del && _token.level >= token.level) {
                    //token与高优先级或前面的token有包含关系则无效
                    if (_token.start <= token.start && _token.end >= token.end ||
                        _token.start >= token.start && _token.end <= token.end
                    ) {
                        token.del = true;
                        break;
                    }
                }
            }
        });
        //删除无效token
        tokens = tokens.filter((item) => {
            return !item.del
        });
        //按在字符串中的位置排序
        tokens.sort((a, b) => {
            return a.start - b.start
        });
        return tokens;

        //检测token是否在排除的区域内
        function _checkToken(token, excludeTokens) {
            for (var i = 0; i < excludeTokens.length; i++) {
                var _token = excludeTokens[i];
                if (_token.start < token.end && _token.end >= token.end ||
                    _token.start <= token.start && _token.end > token.start
                ) {
                    return false;
                }
            }
            return true;
        }
    }
    /**
     * 行内匹配token
     * @param {Number} line 
     * @returns {Array}
     */
    getLineTokens(line) {
        var lineObj = this.lineContext.getLine(line);
        var rules = this.rules.concat(this.seniorRules);
        var tokens = [];
        if (lineObj.pairTokens) {
            var _tokens = this._getTokens(lineObj.text, this.seniorRules);
            //检测seniorToken是否有效【被多行匹配包裹的token将无效】
            _tokens = _tokens.filter((token) => {
                for (var i = 0; i < lineObj.pairTokens.length; i++) {
                    var _token = lineObj.pairTokens;
                    if (_token.matchedNode &&
                        Util.compareNode(_token, token) > 0 &&
                        Util.compareNode(_token.matchedNode, token) < 0 ||
                        Util.compareNode(_token, token) < 0 &&
                        Util.compareNode(_token.matchedNode, token) > 0) {
                        return false;
                    }
                }
                return true;
            });
            tokens = this._getTokens(lineObj.text, this.rules);
            tokens = tokens.filter((token) => {
                for (var i = 0; i < _tokens.length; i++) {
                    var _token = _tokens[i];
                    if (_token.start <= token.start && _token.end >= token.end) {
                        return false;
                    }
                }
                return true;
            });
            tokens = tokens.concat(_tokens);
            tokens.sort((a, b) => {
                return a.start - b.start;
            });
        } else {
            tokens = this._getTokens(lineObj.text, rules);
        }
        return tokens;
    }
    /**
     * 多行匹配token
     * @param {Number} line 
     * @returns {Array}
     */
    getPairTokens(line) {
        var text = this.lineContext.getText(line);
        var tokens = this._getTokens(text, this.pairRules);
        var seniorTokens = this._getTokens(text, this.seniorRules);
        var _tokens = [];
        tokens.map((token) => {
            _tokens.push({
                line: line,
                start: token.start,
                end: token.end,
                type: token.type,
                role: token.role,
                className: token.className,
            });
        });
        this.lineContext.setSeniorTokens(line, seniorTokens);
        return _tokens;
    }
    /**
     * 
     * @param {Array} tokens 行内匹配的token
     * @param {Array} pairTokens 多行匹配的token
     */
    mergeToken(tokens, pairTokens) {
        pairTokens = pairTokens.filter((item) => {
            return item.matchedNode || item.matchend;
        });
        pairTokens = pairTokens.map((item) => {
            var obj = {
                className: item.className
            }
            if (item.matchedNode) {
                if (item.matchedNode.line > item.line) {
                    obj.start = item.start;
                    obj.end = Number.MAX_VALUE;
                } else if (item.line > item.matchedNode.line) {
                    obj.start = 0;
                    obj.end = item.end;
                } else if (item.line == item.matchedNode.line) {
                    if (item.start > item.matchedNode.start) {
                        obj.start = item.matchedNode.start;
                        obj.end = item.end;
                    } else {
                        obj.start = item.start;
                        obj.end = item.matchedNode.end;
                    }
                }
            } else if (item.matchend) {
                obj.start = item.start;
                obj.end = Number.MAX_VALUE;
            }
            return obj;
        });
        pairTokens.map((pairToken) => {
            tokens.map((token) => {
                //token与多行匹配有交叉则无效
                if (pairToken.start <= token.start && pairToken.end > token.start ||
                    pairToken.start < token.end && pairToken.end >= token.end
                ) {
                    token.del = true;
                }
            });
        });
        tokens = tokens.filter((item) => {
            return !item.del
        });
        tokens = tokens.concat(pairTokens);
        tokens.sort((a, b) => {
            return a.start - b.start
        });
        return tokens;
    }
    matchNode() {
        var self = this;
        _matchNode();
        //匹配成对标记
        function _matchNode() {
            Util.cancelNextFrame(self.matchNode.timer);
            self.matchNode.timer = Util.nextFrame(() => {
                if (!self.waiteMatchLines.length) {
                    self.lineContext.setHighlighted(true);
                    return;
                }
                var count = 0;
                var max = 2000;
                var pairTokensList = [];
                var tokenLineMap = {};
                _sortWaiteLines();
                pairTokensList = _getTokenList(max);
                pairTokensList = self.pairLink.insertNode(pairTokensList);
                pairTokensList.map((item) => {
                    tokenLineMap[item.line] = tokenLineMap[item.line] || [];
                    tokenLineMap[item.line].push(item);
                });
                for (var key in tokenLineMap) {
                    self.lineContext.setPairTokens(key, tokenLineMap[key]);
                }
                pairTokensList.map((item) => {
                    self.pairLink.matchNode(item);
                });
                //如果有matchend，需要尝试使其匹配，防止渲染时闪屏
                var lineObj = self.lineContext.getLine(self.lineContext.getLength() - 1);
                while (lineObj && lineObj.className && count < max) {
                    pairTokensList = _getTokenList(1);
                    pairTokensList = self.pairLink.insertNode(pairTokensList);
                    if (pairTokensList.length) {
                        self.lineContext.setPairTokens(pairTokensList[0].line, pairTokensList);
                    }
                    pairTokensList.map((item) => {
                        self.pairLink.matchNode(item);
                    });
                    count++;
                }
                self.lineContext.render();
                _matchNode();
            });
        }
        /**
         * 获取token列表
         * @param {Number} max 一次获取的最大行数
         */
        function _getTokenList(max) {
            var count = 0;
            var pairTokensList = [];
            for (var i = 0; i < self.waiteMatchLines.length; i++) {
                var item = self.waiteMatchLines[i];
                var line = self.waiteMatchLines[i].line;
                var length = self.waiteMatchLines[i].length;
                for (var j = length; j >= 0; j--) {
                    var pairTokens = self.getPairTokens(line + j);
                    !pairTokens.length && self.lineContext.setPairTokens(line + j, []);
                    pairTokensList = pairTokens.concat(pairTokensList);
                    count++;
                    item.length--;
                    if (item.length < 0) {
                        self.waiteMatchLines.splice(i, 1);
                        i--;
                    }
                    //一个时间片最多执行2000行，防止浏览器死锁
                    if (count >= max) {
                        return pairTokensList;
                    }
                }
            }
            return pairTokensList;
        }
        //对待匹配行进行排序，使接近渲染区域的行优先处理
        function _sortWaiteLines() {
            var lineObj = null;
            var lineIndex = 0;
            var startLine = self.lineContext.editor.startLine;
            var endLine = startLine + self.lineContext.editor.maxLine;
            //未滚动视图，不需要排序
            if (self.sortStartLine == startLine || self.stop) {
                return;
            }
            self.sortStartLine = startLine;
            endLine = endLine > self.lineContext.getLength() ? self.lineContext.getLength() : endLine;
            self.waiteMatchLines.sort((a, b) => {
                return b.line - a.line;
            });
            for (var i = 0; i < self.waiteMatchLines.length; i++) {
                var item = self.waiteMatchLines[i];
                if (item.line + item.length >= startLine) {
                    lineObj = item;
                    lineIndex = i;
                } else {
                    break;
                }
            }
            if (lineObj) {
                if (lineObj.line + lineObj.length > endLine) {
                    var lineObj1 = null;
                    var lineObj2 = null;
                    if (lineObj.line <= endLine) {
                        lineObj1 = {
                            line: lineObj.line,
                            length: endLine - lineObj.line
                        }
                        lineObj2 = {
                            line: endLine + 1,
                            length: lineObj.line + lineObj.length - (endLine + 1)
                        }
                        self.waiteMatchLines = [lineObj1].
                        concat(self.waiteMatchLines.slice(lineIndex + 1)).
                        concat(self.waiteMatchLines.slice(0, lineIndex));
                        if (lineObj2.length >= 0) {
                            self.waiteMatchLines.push(lineObj2);
                        }
                    }
                } else {
                    self.waiteMatchLines = self.waiteMatchLines.slice(lineIndex).
                    concat(self.waiteMatchLines.slice(0, lineIndex));
                }
            }
        }
    }
    /**
     * 插入内容前触发
     * @param {Number} line 
     */
    onInsertContentBefore(line) {
        this.lineContext.setHighlighted(false);
        this.onInsertContentBefore.waiteMatchNodes = this.pairLink.deleteNodeByLine(line);
    }
    /**
     * 插入内容后触发
     * @param {Number} line 
     * @param {Number} length 新增的行数
     */
    onInsertContentAfter(line, length) {
        var insert = true;
        if (length > 0) {
            this.pairLink.moveLine(line, length);
        }
        if (this.onInsertContentBefore.waiteMatchNodes) {
            this.onInsertContentBefore.waiteMatchNodes.map((item) => {
                this.pairLink.matchNode(item);
            });
            this.onInsertContentBefore.waiteMatchNodes = null;
        }
        this.waiteMatchLines = this.waiteMatchLines || []; //待匹配的行
        for (var i = 0; i < this.waiteMatchLines.length; i++) {
            var item = this.waiteMatchLines[i];
            if (line >= item.line && line <= item.line + item.length) { //在item的范围内插入
                item.length += length;
                insert = false;
            } else if (line < item.line) { //在item的范围之前插入
                item.line += length;
            }
        }
        if (insert) {
            this.waiteMatchLines.unshift({
                line: line,
                length: length
            });
            //待匹配行需要重新排序
            self.sortStartLine = 0;
        }
        this.matchNode();
    }
    /**
     * 删除内容前触发
     * @param {Number} line 
     * @param {Number} length 减少的行数
     */
    onDeleteContentBefore(line, length) {
        this.lineContext.setHighlighted(false);
        this.onDeleteContentBefore.waiteMatchNodes = this.pairLink.deleteNodeByLine(line, length + 1);
        if (this.waiteMatchLines && this.waiteMatchLines.length) {
            for (var i = 0; i < this.waiteMatchLines.length; i++) {
                var item = this.waiteMatchLines[i];
                if (item.line >= line + length) { //在删除的范围之后
                    item.line -= length;
                } else if (item.line <= line) {
                    if (item.line + item.length > line) {
                        if (item.line + item.length >= line + length) { //包含删除范围
                            item.length = item.length - length;
                        } else { //与删除范围首行有交叉
                            item.length = line - item.line;
                        }
                    }
                } else if (item.line + item.length <= line + length) { //被删除范围包含
                    this.waiteMatchLines.splice(i, 1);
                    i--;
                } else { //与删除范围行末有交叉
                    item.line = line;
                    item.length = (item.line + item.length) - (line + length);
                }
            }
        }
    }
    /**
     * 删除内容后触发
     * @param {Number} line 
     * @param {Number} length 减少的行数
     */
    onDeleteContentAfter(line, length) {
        if (length > 0) {
            this.pairLink.moveLine(line, -length);
        }
        var pairTokens = this.getPairTokens(line);
        pairTokens = this.pairLink.insertNode(pairTokens);
        this.lineContext.setPairTokens(line, pairTokens);
        pairTokens.map((item) => {
            this.pairLink.matchNode(item);
        });
        if (this.onDeleteContentBefore.waiteMatchNodes) {
            this.onDeleteContentBefore.waiteMatchNodes.map((item) => {
                this.pairLink.matchNode(item);
            });
            this.onDeleteContentBefore.waiteMatchNodes = null;
        }
        if (!this.waiteMatchLines.length) {
            this.lineContext.setHighlighted(true);
        }
    }
}
export default Highlight;