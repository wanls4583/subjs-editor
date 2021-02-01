import Util from "../../common/util";
import RBtree from "../../common/redBlackTree";

/*
 * @Author: lisong
 * @Date: 2020-11-16 11:15:55
 * @Description: 
 */
class PairLink {
    constructor(lineContext) {
        this.lineContext = lineContext;
        this.tree = new RBtree(Util.compareNode, true);
    }
    /**
     * 插入token到链表
     * @param {Array} nodes 
     */
    insertNode(nodes) {
        var result = [];
        if (nodes.length) {
            nodes.map((node) => {
                result.push(this.tree.insert(node));
            });
        }
        return result;
    }
    /**
     * 删除
     * @param {Number} line 
     * @param {Number} length 删除的行数
     */
    deleteNodeByLine(line, length) {
        length = length || 1;
        var waiteMatchNodes = [];
        //找到删除区域的第一个node
        var node = this.tree.find(null, (a, b) => {
            if (b.line >= line && b.line <= line + length) {
                if (!b.pre || b.pre.line < line) {
                    return 0
                }
                return -1;
            } else if (b.line < line) {
                return 1;
            } else if (b.line > line + length) {
                return -1;
            }
        });
        while (node && this.tree.head) {
            if (node.line >= line && node.line < line + length) {
                var next = null;
                if (node.lChild || !node.rChild) {
                    next = node.next;
                } else {
                    //真正删除的节点为其前件，next仍未其本身，只是数据被交换
                    next = node;
                }
                if (node.matchedNode) {
                    this.lineContext.unMatchFoldToken(node);
                    delete node.matchedNode.matchedNode;
                    if (node.matchedNode.line >= line + length || node.matchedNode.line < line) {
                        waiteMatchNodes = waiteMatchNodes.concat(node.matchedNode);
                    }
                    delete node.matchedNode;
                }
                var delNode = this.tree.delete(node);
                var index = waiteMatchNodes.indexOf(delNode);
                var lineObj = this.lineContext.getLine(delNode.line);
                var foldTokens = lineObj.foldTokens || [];
                //真正被删除的节点被waiteMatchNodes引用，需要更改成新的引用
                if (index > -1) {
                    waiteMatchNodes[index] = node;
                }
                index = foldTokens.indexOf(delNode);
                //真正被删除的节点被lineObj.foldTokens引用，需要更改成新的引用
                if (index > -1) {
                    foldTokens[index] = node;
                }
                //进行删除操作好后，matchedNode需要重新引用
                if (node.matchedNode) {
                    node.matchedNode.matchedNode = node;
                }
                node = next;
            } else {
                break;
            }
        }
        this.lineContext.setFoldTokens(line, null);
        return waiteMatchNodes;
    }
    /**
     * 以node为基础开始匹配
     * @param {Object} node 
     */
    matchNode(node) {
        var self = this;
        var waiteMatchNodes = [node];
        //使用循环调用防止函数递归超出堆栈
        while (waiteMatchNodes.length) {
            var arr = _matchNode(waiteMatchNodes.shift());
            if (arr && arr.length) {
                waiteMatchNodes = waiteMatchNodes.concat(arr);
            }
        }
        /**
         * 开始执行
         * @param {Node} node 
         */
        function _matchNode(node) {
            var lineObj = self.lineContext.getLine(node.line);
            //节点已匹配
            if (node.matchedNode) {
                return;
            }
            //节点在多行匹配范围中
            if (lineObj.tokenType) {
                return;
            }
            //在同一行中检查以上情况
            if (_checkInvalid(node)) {
                return;
            }
            var _node = null;
            if (node.role == Util.constData.PAIR_START) {
                _node = _findSufMatchNode(node);
            } else {
                _node = _findPreMatchNode(node);
            }
            if (_node) {
                if (_node.matchedNode) {
                    waiteMatchNodes.push(_node.matchedNode);
                    self.lineContext.unMatchFoldToken(_node);
                    delete _node.matchedNode.matchedNode;
                }
                _node.matchedNode = node;
                node.matchedNode = _node;
                self.lineContext.matchFoldToken(node);
            }
        }
        /**
         * 检测node是否被同行的多行匹配的node包裹
         * @param {Node} node 
         */
        function _checkInvalid(node) {
            var lineObj = self.lineContext.getLine(node.line);
            if (lineObj.pairTokens) {
                for (var i = 0; i < lineObj.pairTokens.length; i++) {
                    var _node = lineObj.pairTokens[i];
                    if (_node.matchedNode && _node.start < node.start && Util.compareNode(_node.matchedNode, node) > 0) {
                        return true;
                    }
                    if (_node.start < node.start && _node.matchend) {
                        return true;
                    }
                    if (_node.start >= node.end) {
                        return false;
                    }
                }
            }
            return false;
        }
        /**
         * 向前寻找开始节点
         * @param {Node} node 
         */
        function _findPreMatchNode(node) {
            var _node = node.pre;
            while (_node) {
                var lineObj = self.lineContext.getLine(_node.line);
                if (!lineObj.tokenType && !_checkInvalid(_node) && _node.role == Util.constData.PAIR_START && (!_node.matchedNode || Util.compareNode(_node.matchedNode, node) > 0)) {
                    return _node;
                }
                _node = _node.pre;
            }
            return _node;
        }
        /**
         * 向后匹配结束节点
         * @param {Node} node 
         */
        function _findSufMatchNode(node) {
            var _node = node.next;
            while (_node) {
                var lineObj = self.lineContext.getLine(_node.line);
                if (!lineObj.tokenType && !_checkInvalid(_node) && _node.role == Util.constData.PAIR_END && (!_node.matchedNode || Util.compareNode(_node.matchedNode, node) < 0)) {
                    return _node;
                }
                _node = _node.next;
            }
            return _node;
        }
    }
    /**
     * 行号移位
     * @param {Number} line 开始行
     * @param {Number} length 增加的行数
     */
    moveLine(line, length) {
        //找到增加区域的第一个node
        var node = this.tree.find(null, (a, b) => {
            if (b.line > line) {
                if (!b.pre || b.pre.line <= line) {
                    return 0
                }
                return -1;
            } else if (b.line <= line) {
                return 1;
            }
        });
        while (node) {
            if (node.line > line) {
                node.line += length;
            }
            node = node.next;
        }
    }
}
export default PairLink;