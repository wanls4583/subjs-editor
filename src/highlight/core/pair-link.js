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
        var self = this;
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
                    this.lineContext.unMatchPairToken(node);
                    delete node.matchedNode.matchedNode;
                    if (node.matchedNode.line >= line + length || node.matchedNode.line < line) {
                        waiteMatchNodes = waiteMatchNodes.concat(_getReMatchNode(node));
                    }
                    delete node.matchedNode;
                } else if (node.matchend) {
                    this.lineContext.unMatchPairToken(node);
                    waiteMatchNodes = waiteMatchNodes.concat(_getReMatchNode(node));
                    delete node.matchend;
                }
                var delNode = this.tree.delete(node);
                var index = waiteMatchNodes.indexOf(delNode);
                var lineObj = this.lineContext.getLine(delNode.line);
                var pairTokens = lineObj.pairTokens || [];
                //真正被删除的节点被waiteMatchNodes引用，需要更改成新的引用
                if (index > -1) {
                    waiteMatchNodes[index] = node;
                }
                index = pairTokens.indexOf(delNode);
                //真正被删除的节点被lineObj.pairTokens引用，需要更改成新的引用
                if (index > -1) {
                    pairTokens[index] = node;
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
        this.lineContext.setPairTokens(line, null);
        //获取需要重新匹配的node
        function _getReMatchNode(node) {
            var nodes = [];
            if (node.matchedNode) {
                var startNode = node;
                var endNode = null;
                if (Util.compareNode(node, node.matchedNode) > 0) {
                    startNode = node.matchedNode;
                }
                endNode = startNode == node ? node.matchedNode : node;
                if (startNode == node) {
                    startNode = startNode.next;
                }
                while (startNode != endNode) {
                    // /*
                    // `
                    // `
                    // /*
                    // */
                    // 如上所示，当删除第一行时，其与第五行的matchedNode中间的标记都需要重新匹配
                    if (startNode.line >= line + length || startNode.line < line) {
                        nodes.push(startNode);
                    }
                    startNode = startNode.next;
                }
                if (endNode != node) {
                    nodes.push(endNode);
                }
            } else if (node.matchend) {
                // /*
                // /*
                // `
                // 如上所示，当删除第一行时，其后的标记都需要重新匹配
                while (node.next) {
                    if (node.line >= line + length) {
                        nodes.push(node.next);
                    }
                    node = node.next;
                }
            }
            return nodes;
        }
        return waiteMatchNodes;
    }
    /**
     * 找到node插入位置的前一个节点
     * @param {Object} node 
     */
    findPreNode(node) {
        var _node = this.tree.head;
        var result = null;
        while (_node && Util.compareNode(_node, node) < 0) {
            result = _node;
            _node = _node.next;
        }
        return result;
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
            var waiteMatchNodes = [];
            var lineObj = self.lineContext.getLine(node.line);
            //节点已匹配
            if (node.matchedNode) {
                return;
            }
            //节点在其他类型的已匹配范围中
            if (lineObj.tokenType && lineObj.tokenType != node.type) {
                return;
            }
            //节点在同类型的已匹配范围中且为开始标记
            if (lineObj.tokenType == node.type && node.role == Util.constData.PAIR_START) {
                return;
            }
            //在同一行中检查以上两种情况
            if (_checkInvalid(node)) {
                return;
            }
            if (node.role == Util.constData.PAIR_START_END) { //node为特殊标记
                var preNode = _findPreMatchNode(node);
                waiteMatchNodes = _findSufMatchNode(preNode || node);
            } else if (node.role == Util.constData.PAIR_START) { //node为开始标记
                waiteMatchNodes = _findSufMatchNode(node);
            } else if (node.role == Util.constData.PAIR_END) { //node为结束标记
                var preNode = _findPreMatchNode(node);
                if (preNode) {
                    waiteMatchNodes = _findSufMatchNode(preNode);
                }
            }
            return waiteMatchNodes;
        }
        /**
         * 检测node是否被同行的已匹配node包裹或者开始标记处于高优先级的单行token中
         * @param {Node} node 
         */
        function _checkInvalid(node) {
            var lineObj = self.lineContext.getLine(node.line);
            if (node.role == Util.constData.PAIR_START || node.role == Util.constData.PAIR_START_END) {
                for (var i = 0; i < lineObj.seniorTokens.length; i++) {
                    var token = lineObj.seniorTokens[i];
                    var valid = true;
                    //如果高优先级单行token被多行已匹配token包裹则无无效
                    for (var j = 0; j < lineObj.pairTokens.length; j++) {
                        var _token = lineObj.pairTokens[j];
                        if (_token.start >= token.start && _token.matchedNode) {
                            valid = false;
                            break;
                        }
                    }
                    if (valid && token.start < node.end && token.end > node.start) {
                        return true;
                    }
                }
            }
            for (var i = 0; i < lineObj.pairTokens.length; i++) {
                var _node = lineObj.pairTokens[i];
                if (_node.matchedNode && _node.start < node.start && Util.compareNode(_node.matchedNode, node) > 0) {
                    if (_node.type != node.type || node.role == Util.constData.PAIR_START) {
                        return true;
                    }
                }
                if (_node.start < node.start && _node.matchend) {
                    return true;
                }
                if (_node.start >= node.end) {
                    return false;
                }
            }
            return false;
        }
        /**
         * 向前寻找开始节点
         * @param {Node} node 
         */
        function _findPreMatchNode(node) {
            var _node = node;
            //寻找开始标记
            while (_node.pre) {
                if (_node.pre.matchedNode) {
                    // `
                    // */
                    // `
                    // 如上所示，第二行的*/向上查找过程中遇到其他类型的已匹配标记
                    // /*
                    // */
                    // */
                    //如上所示，第三行*/想上查找过程中遇到同类型的结束符
                    //综上，当向上查找过程中遇到其他类型的已匹配标记或同类型的已匹配结束标记，当前标记将无效
                    if (_node.pre.type != node.type || _node.pre.role == Util.constData.PAIR_END) {
                        return;
                    }
                    // `C
                    // `B
                    // `A
                    // 如上所示，特殊标记向上A（第三行的`）查找过程中遇到已匹配的特殊标记B且匹配的标记C在B之前，当前标记A无效
                    if (
                        _node.pre.type == node.type &&
                        node.role == Util.constData.PAIR_START_END &&
                        Util.compareNode(_node.pre.matchedNode, node) < 0
                    ) {
                        return;
                    }
                }
                //找到同类型的开始标记
                if (_node.pre.type == node.type && _node.pre.role <= Util.constData.PAIR_START_END) {
                    if (!self.lineContext.getWholeClassName(_node.pre.line)) {
                        return _node.pre;
                    }
                }
                _node = _node.pre;
            }
        }
        /**
         * 向后匹配结束节点
         * @param {Node} node 
         */
        function _findSufMatchNode(node) {
            var _node = node;
            var waiteMatchNodes = [];
            var preMatchedNodes = [];
            // /*
            // */*
            // 如上，第二行的/*将无效
            if (_node.pre &&
                _node.pre.line == node.line &&
                _node.pre.end > node.start &&
                _node.pre.matchedNode &&
                _node.pre.type == node.type &&
                _node.pre.role == Util.constData.PAIR_END) {
                return [];
            }
            //寻找结束标记
            while (_node.next) {
                // /*
                // `
                // [其他类型的标记]
                // 如上所示，在寻找第一行/*的结束标记时，其后的标记都将无效
                if (_node.next.matchedNode) {
                    self.lineContext.unMatchPairToken(_node.next);
                    preMatchedNodes.push(_node.next);
                } else if (_node.next.matchend) {
                    self.lineContext.unMatchPairToken(_node.next);
                    preMatchedNodes.push(_node.next);
                }
                //找到同类型的结束标记
                if (_node.next.type == node.type && _node.next.role + node.role == 0) {
                    //需要排除/*/这种情况
                    if (!(_node.next.line == node.line && _node.next.start < node.end)) {
                        preMatchedNodes.map((item) => {
                            // `
                            // /*
                            // `
                            // `
                            // /**/
                            // 如上所示，当添加第一行使第二行的/*无效时，第二行之后的标记需要重新匹配
                            if (item.matchedNode) {
                                var _item = _node.next.next;
                                while (_item && Util.compareNode(_item, item.matchedNode) <= 0) {
                                    waiteMatchNodes.push(_item);
                                    _item = _item.next;
                                }
                            } else if (item.matchend) {
                                // ` A
                                // /*B
                                // `
                                // /*
                                // 如上所示，添加A后，B之后的区域需要重新匹配
                                var _item = _node.next.next;
                                while (_item) {
                                    waiteMatchNodes.push(_item);
                                    //遇到同类型标记，则该标记必然也是开始标记，可以匹配到结尾
                                    if (_item.type == item.type) {
                                        if (_item.role == Util.constData.PAIR_START_END) {
                                            throw new Error('matchNode error');
                                        }
                                        break;
                                    }
                                    _item = _item.next;
                                }
                            }
                            if (item.matchedNode) {
                                delete item.matchedNode.matchedNode;
                                delete item.matchedNode;
                            } else {
                                delete item.matchend;
                            }
                        });
                        self.lineContext.unMatchPairToken(node);
                        preMatchedNodes = null;
                        if (node.matchedNode) {
                            // ` A
                            // ` B
                            // /*
                            // ` C
                            // 如上，插入第二行导致第一行重新匹配，(B,C]区域需要重新匹配
                            var temp = _node.next.next;
                            while (temp && Util.compareNode(temp, node.matchedNode) <= 0) {
                                waiteMatchNodes.push(temp);
                                temp = temp.next;
                            }
                            delete node.matchedNode.matchedNode;
                        } else if (node.matchend) {
                            var temp = _node.next.next;
                            while (temp) {
                                waiteMatchNodes.push(temp);
                                temp = temp.next;
                            }
                            delete node.matchend;
                        }
                        node.matchedNode = _node.next;
                        _node.next.matchedNode = node;
                        self.lineContext.matchedPairToken(node);
                        break;
                    }
                }
                _node = _node.next;
            }
            preMatchedNodes && preMatchedNodes.map((item) => {
                if (item.matchedNode) {
                    delete item.matchedNode.matchedNode;
                    delete item.matchedNode;
                } else {
                    delete item.matchend;
                }
            });
            //匹配到结尾
            if (!node.matchedNode) {
                node.matchend = true;
                self.lineContext.matchedPairToken(node);
            }
            return waiteMatchNodes;
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