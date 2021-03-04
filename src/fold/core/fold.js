import Util from '../../common/util';
import {
    foldRules
} from '../javascript/rules';
import PairLink from './pair-link';
class Highlight {
    constructor(lineContext, option) {
        this.foldRules = [];
        this.pairLink = new PairLink(lineContext);
        this.lineContext = lineContext;
        (option.foldRules || foldRules).map((item) => {
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
            this.foldRules.push(startRule);
            if (startRegStr == endRegStr) {
                startRule.role = Util.constData.PAIR_START_END;
                endRule.role = Util.constData.PAIR_START_END;
            } else {
                startRule.role = Util.constData.PAIR_START;
                endRule.role = Util.constData.PAIR_END;
                this.foldRules.push(endRule);
            }
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
            //按在字符串中的位置排序
            return a.start - b.start;
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
    getLineTokens(line) {
        var text = this.lineContext.getText(line);
        var tokens = this._getTokens(text, this.foldRules);
        tokens.map((item) => {
            item.line = line;
        });
        return tokens;
    }
    matchNode() {
        var self = this;
        if (this.lineContext.getHighlighted()) {
            _matchNode();
        } else {
            setTimeout(() => {
                _matchNode();
            }, 100);
        }
        //匹配成对标记
        function _matchNode() {
            Util.cancelNextFrame(self.matchNode.timer);
            self.matchNode.timer = Util.nextFrame(() => {
                if (!self.waiteMatchLines.length) {
                    return;
                }
                var max = 2000;
                var foldTokensList = [];
                var tokenLineMap = {};
                _sortWaiteLines();
                foldTokensList = _getTokenList(max);
                foldTokensList = self.pairLink.insertNode(foldTokensList);
                foldTokensList.map((item) => {
                    tokenLineMap[item.line] = tokenLineMap[item.line] || [];
                    tokenLineMap[item.line].push(item);
                });
                for (var key in tokenLineMap) {
                    self.lineContext.setFoldTokens(key, tokenLineMap[key]);
                }
                foldTokensList.map((item) => {
                    self.pairLink.matchNode(item);
                });
                self.lineContext.renderNum();
                _matchNode();
            });
        }
        /**
         * 获取token列表
         * @param {Number} max 一次获取的最大行数
         */
        function _getTokenList(max) {
            var count = 0;
            var foldTokensList = [];
            for (var i = 0; i < self.waiteMatchLines.length; i++) {
                var item = self.waiteMatchLines[i];
                var line = self.waiteMatchLines[i].line;
                var length = self.waiteMatchLines[i].length;
                for (var j = length; j >= 0; j--) {
                    var foldTokens = self.getLineTokens(line + j);
                    !foldTokens.length && self.lineContext.setFoldTokens(line + j, []);
                    foldTokensList = foldTokens.concat(foldTokensList);
                    count++;
                    item.length--;
                    if (item.length < 0) {
                        self.waiteMatchLines.splice(i, 1);
                        i--;
                    }
                    //一个时间片最多执行2000行，防止浏览器死锁
                    if (count >= max) {
                        return foldTokensList;
                    }
                }
            }
            return foldTokensList;
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
        var foldTokens = this.getLineTokens(line);
        foldTokens = this.pairLink.insertNode(foldTokens);
        this.lineContext.setFoldTokens(line, foldTokens);
        foldTokens.map((item) => {
            this.pairLink.matchNode(item);
        });
        if (this.onDeleteContentBefore.waiteMatchNodes) {
            this.onDeleteContentBefore.waiteMatchNodes.map((item) => {
                this.pairLink.matchNode(item);
            });
            this.onDeleteContentBefore.waiteMatchNodes = null;
        }
    }
}
export default Highlight;