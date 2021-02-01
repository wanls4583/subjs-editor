/*
 * @Author: lisong
 * @Date: 2020-12-12 11:41:23
 * @Description: 红黑树
 */
class RBNode {
    /**
     * 
     * @param {*} value 
     * @param {Boolean} mergeProperty 是否合并属性 
     */
    constructor(value, mergeProperty) {
        this.color = RBNode.RED;
        this.lChild = null;
        this.rChild = null;
        this.next = null;
        this.pre = null;
        this.p = null;
        this.originValue = value;
        this.value = value;
        if (mergeProperty && typeof value == 'object') {
            Object.assign(this, value);
        }
    }
    setRedColor() {
        this.color = RBNode.RED;
    }
    setBlackColor() {
        this.color = RBNode.BLACK;
    }
    getColor() {
        return this.color;
    }
    getValue() {
        return this.value;
    }
}
RBNode.RED = 'RED';
RBNode.BLACK = 'BLACK';
RBNode.keys = Object.keys(new RBNode());
class RBTree {
    /**
     * 
     * @param {Function} comparator 比较器 
     * @param {Boolean} mergeProperty 是否合并属性 
     */
    constructor(comparator, mergeProperty) {
        this.mergeProperty = mergeProperty
        this.comparator = comparator || function (a, b) {
            return a.value - b.value
        };
        this.head = null;
    }
    insert(value) {
        var self = this;
        var node = new RBNode(value, this.mergeProperty);
        this._insert(node);
        _balance(node);
        return node;
        /**
         * 调整树
         * @param {Node} node 
         */
        function _balance(node) {
            var p = node.p;
            var pp = p && p.p;
            if (p && p.getColor() == RBNode.RED) { //父节点是红色
                var u = pp.rChild; //叔叔节点
                if (pp.rChild == p) {
                    u = pp.lChild;
                }
                if (u && u.getColor() == RBNode.RED) { //叔叔节点为红色，直接更改颜色即可
                    p.setBlackColor();
                    u.setBlackColor();
                    pp.setRedColor();
                    _balance(pp);
                } else { //叔叔节点为黑色
                    if (pp.lChild == p) { //node在pp的左子树
                        if (p.rChild == node) { //node在p的右子树
                            self.leftRotate(p);
                        }
                        self.rightRotate(pp);
                    } else { //node在pp的右子树
                        if (p.lChild == node) { //node在p的左子树
                            self.rightRotate(p);
                        }
                        self.leftRotate(pp);
                    }
                }
            } else if (!p) { //node为跟节点
                node.setBlackColor();
            }
        }
    }
    delete(value) {
        var node = value instanceof RBNode ? value : this.find(value);
        //不存在该节点，则直接返回
        if (!node) {
            return;
        }
        return this._delete(node);
    }
    find(value, comparator) {
        var node = new RBNode(value, this.mergeProperty);
        var _node = this.head;
        var result = 0;
        comparator = comparator || this.comparator;
        while (_node) {
            result = comparator(node, _node);
            if (result == 0) {
                return _node;
            }
            if (result > 0) {
                _node = _node.rChild;
            } else {
                _node = _node.lChild;
            }
        }
    }
    /**
     * 
     * @param {Node} node 
     */
    leftRotate(node) {
        var p = node.p;
        var rightNode = node.rChild;
        var rightLeftNode = rightNode.lChild;
        var pColor = rightNode.getColor();
        var color = node.getColor();
        if (p) {
            if (p.rChild == node) {
                p.rChild = rightNode;
            } else {
                p.lChild = rightNode;
            }
        } else {
            this.head = rightNode;
        }
        rightNode.p = p;
        rightNode.lChild = node;
        node.p = rightNode;
        node.rChild = rightLeftNode;
        rightLeftNode && (rightLeftNode.p = node);
        pColor == RBNode.RED ? node.setRedColor() : node.setBlackColor();
        color == RBNode.RED ? rightNode.setRedColor() : rightNode.setBlackColor();
    }
    /**
     * 
     * @param {Node} node 
     */
    rightRotate(node) {
        var p = node.p;
        var leftNode = node.lChild;
        var leftRightNode = leftNode.rChild;
        var pColor = leftNode.getColor();
        var color = node.getColor();
        if (p) {
            if (p.lChild == node) {
                p.lChild = leftNode;
            } else {
                p.rChild = leftNode;
            }
        } else {
            this.head = leftNode;
        }
        leftNode.p = p;
        leftNode.rChild = node;
        node.p = leftNode;
        node.lChild = leftRightNode;
        leftRightNode && (leftRightNode.p = node);
        pColor == RBNode.RED ? node.setRedColor() : node.setBlackColor();
        color == RBNode.RED ? leftNode.setRedColor() : leftNode.setBlackColor();
    }
    /**
     * 二叉树插入
     * @param {RBNode} node 
     */
    _insert(node) {
        var _node = this.head;
        var leafNode = null;
        var preNode = null;
        var nextNode = null;
        var result = 0;
        if (!_node) {
            this.head = node;
            this.head.setBlackColor();
            return;
        }
        while (_node) {
            result = this.comparator(node, _node)
            leafNode = _node;
            if (result > 0) {
                preNode = _node;
                _node = _node.rChild;
            } else if (result < 0) {
                nextNode = _node;
                _node = _node.lChild;
            } else {
                console.log(`%cvalue ${node.value} exsit`, 'color:red');
                return;
            }
        }
        if (result > 0) {
            leafNode.rChild = node;
            node.p = leafNode;
        } else {
            leafNode.lChild = node;
            node.p = leafNode;
        }
        if (nextNode) {
            node.next = nextNode;
            if (nextNode.pre) {
                nextNode.pre.next = node;
                node.pre = nextNode.pre;
            }
            nextNode.pre = node;
        } else if (preNode) {
            node.pre = preNode;
            if (preNode.next) {
                preNode.next.pre = node;
                node.next = preNode.next;
            }
            preNode.next = node;
        }
    }
    /**
     * 二叉树删除
     * @param {RBNode} node 
     */
    _delete(node) {
        var self = this;
        var p = null;
        var _node = null;
        if (node.lChild) {
            _node = node.pre; //删除的叶子节点为node的前件
            _changeValue(node, _node);
        } else if (node.rChild) {
            _node = node.next; //删除的叶子节点为node的后件
            _changeValue(node, _node);
        }
        if (!_node) {
            _node = node;
        }
        if (_node.pre) {
            _node.pre.next = _node.next;
        }
        if (_node.next) {
            _node.next.pre = _node.pre;
        }
        if (_node.p && _node.getColor() == RBNode.BLACK) { //删除的是黑色节点，需要重新调整红黑树
            _balance(_node);
        }
        p = _node.p;
        if (!p) { //删除的是根节点
            this.head = null;
        } else { //删除的是叶子节点
            if (p.lChild == _node) {
                p.lChild = _node.lChild || _node.rChild;
            } else {
                p.rChild = _node.lChild || _node.rChild;
            }
            p.lChild && (p.lChild.p = p);
            p.rChild && (p.rChild.p = p);
        }
        return _node;

        function _changeValue(node, _node) {
            for (var key in _node) {
                if (RBNode.keys.indexOf(key) == -1) {
                    node[key] = _node[key];
                }
            }
            node.originValue = _node.originValue;
            node.value = _node.value;
        }
        /**
         * 调整红黑树
         * @param {RBNode} node 已删除的字节点
         */
        function _balance(node) {
            var p = node.p;
            if (p.lChild == node) { //p的左子树需要增加黑色节点
                if (p.rChild && p.rChild.getColor() == RBNode.RED) { //叔叔节点为红色，需要将叔叔节点转变为黑色
                    self.leftRotate(p);
                    _balance(node);
                    return;
                }
                if (p.rChild && p.rChild.rChild && p.rChild.rChild.getColor() == RBNode.RED) { //右子树的右节点为红色
                    p.rChild.rChild.setBlackColor();
                    self.leftRotate(p);
                } else if (p.rChild && p.rChild.lChild && p.rChild.lChild.getColor() == RBNode.RED) { //右子树的左节点为红色
                    //先将红色节点旋转到右边
                    self.rightRotate(p.rChild);
                    p.rChild.rChild.setBlackColor();
                    self.leftRotate(p);
                } else if (p.getColor() == RBNode.RED) { //父亲节点为红色，直接更改父节点与叔叔节点的颜色即可
                    p.setBlackColor();
                    p.rChild.setRedColor();
                } else { //以父节点为删除节点，向上调整
                    p.rChild.setRedColor();
                    p.p && _balance(p);
                }
            } else { //p的右子树需要增加黑色节点
                if (p.lChild && p.lChild.getColor() == RBNode.RED) { //叔叔节点为红色，需要将叔叔节点转变为黑色
                    self.rightRotate(p);
                    _balance(node);
                    return;
                }
                if (p.lChild && p.lChild.lChild && p.lChild.lChild.getColor() == RBNode.RED) { //左子树的左节点为红色
                    p.lChild.lChild.setBlackColor();
                    self.rightRotate(p);
                } else if (p.lChild && p.lChild.rChild && p.lChild.rChild.getColor() == RBNode.RED) { //左子树的右节点为红色
                    //先将红色节点旋转到左边
                    self.leftRotate(p.lChild);
                    p.lChild.lChild.setBlackColor();
                    self.rightRotate(p);
                } else if (p.getColor() == RBNode.RED) { //父亲节点为红色，直接更改父节点与叔叔节点的颜色即可
                    p.setBlackColor();
                    p.lChild.setRedColor();
                } else { //以父节点为删除节点，向上调整
                    p.lChild.setRedColor();
                    p.p && _balance(p);
                }
            }
        }
    }
    // _testInsert(count) {
    //     console.log(`%ctestInsert`, 'color:red');
    //     var tree = new RBTree();
    //     var end = null;
    //     var arr = [];
    //     count = count || 10;
    //     for (var i = 0; i < count; i++) {
    //         tree.insert(Math.floor(Math.random() * 100000000));
    //     }
    //     this._draw(tree)
    //     var node = tree.head;
    //     while (node.pre) {
    //         node = node.pre;
    //     }
    //     while (node) {
    //         arr.push(node.value);
    //         end = node;
    //         node = node.next;
    //     }
    //     for (var i = 0; i < arr.length - 1; i++) {
    //         if (arr[i] > arr[i + 1]) {
    //             throw new Error('next node error');
    //         }
    //     }
    //     arr = [];
    //     while (end) {
    //         arr.push(end.value);
    //         end = end.pre;
    //     }
    //     for (var i = 0; i < arr.length - 1; i++) {
    //         if (arr[i] < arr[i + 1]) {
    //             throw new Error('pre node error');
    //         }
    //     }
    //     console.log(`%cinsert ${count} number success`, 'color:green');
    // }
    // _testDelete() {
    //     console.log('%ctestDelete', 'color:red');
    //     var tree = new RBTree();
    //     var size = 1000000;
    //     for (var i = 1; i <= size; i++) {
    //         tree.insert(i);
    //     }
    //     var retains = [];
    //     console.log(tree.head)
    //     //只保留10个随机数目
    //     for (var i = 0; i < 10; i++) {
    //         retains.push((Math.random() * size) >> 0);
    //     }
    //     console.log('retains', retains);
    //     for (var i = 1; i <= size; i++) {
    //         if (retains.indexOf(i) == -1) {
    //             tree.delete(i);
    //         }
    //     }
    //     this._draw(tree);
    //     var node = tree.head;
    //     var end = null;
    //     var arr = [];
    //     while (node.pre) {
    //         node = node.pre;
    //     }
    //     while (node) {
    //         arr.push(node.value);
    //         end = node;
    //         node = node.next;
    //     }
    //     console.log(arr);
    //     for (var i = 0; i < arr.length - 1; i++) {
    //         if (arr[i] > arr[i + 1]) {
    //             throw new Error('next node error');
    //         }
    //     }
    //     arr = [];
    //     while (end) {
    //         arr.push(end.value);
    //         end = end.pre;
    //     }
    //     console.log(arr);
    //     for (var i = 0; i < arr.length - 1; i++) {
    //         if (arr[i] < arr[i + 1]) {
    //             throw new Error('pre node error');
    //         }
    //     }
    //     console.log(`%cdelete ${size - 10} number success`, 'color:green');
    // }
    // _draw(tree) {
    //     var ctx = document.querySelector('#canvas').getContext('2d');
    //     var width = 200;
    //     var height = 4;
    //     ctx.lineWidth = 2;
    //     ctx.font = "12px bold";
    //     ctx.textAlign = 'center';
    //     _draw(tree.head);

    //     function _draw(node) {
    //         node.height = node.p ? node.p.height + 1 : 1;
    //         if (!node) {
    //             return;
    //         }
    //         if (!node.p) {
    //             node.x = 400;
    //             node.y = 40;
    //         } else if (node.p.lChild == node) {
    //             var w = width * (node.height + 1) / height;
    //             node.x = node.p.x - w;
    //             node.y = node.p.y + 100;
    //         } else {
    //             var w = width * (node.height + 1) / height;
    //             node.x = node.p.x + w;
    //             node.y = node.p.y + 100;
    //         }
    //         ctx.beginPath();
    //         ctx.globalCompositeOperation = "source-over";
    //         ctx.fillStyle = "#fff";
    //         ctx.arc(node.x, node.y, 12, 0, 2 * Math.PI);
    //         ctx.fill();
    //         if (node.color == RBNode.RED) {
    //             ctx.strokeStyle = "red";
    //         } else {
    //             ctx.strokeStyle = "#000";
    //         }
    //         ctx.arc(node.x, node.y, 12, 0, 2 * Math.PI);
    //         ctx.stroke();
    //         ctx.closePath();

    //         ctx.fillStyle = "#000";
    //         ctx.fillText(node.value, node.x, node.y + 4);

    //         ctx.beginPath();
    //         ctx.globalCompositeOperation = "destination-over";
    //         ctx.strokeStyle = "#000";
    //         if (node.p) {
    //             ctx.moveTo(node.x, node.y);
    //             ctx.lineTo(node.p.x, node.p.y);
    //         }
    //         ctx.stroke();
    //         ctx.closePath();

    //         node.lChild && _draw(node.lChild);
    //         node.rChild && _draw(node.rChild);
    //     }
    // }

}
export default RBTree;