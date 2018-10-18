//节点
function AVLNode(key, data, ifMerge) {
    this.key = key; //查找关键字
    this.lChild = null; //左子树
    this.rChild = null; //右子树
    this.pre = null; //中序前一个节点
    this.next = null; //中序后一个节点
    this.pNode = null; //父节点
    this.height = 0; //节点的高度
    if (ifMerge) { //将插入的数据合并到节点
        for (var key in data) {
            this[key] = data[key];
        }
    } else {
        this.data = data; //节点数据
    }
}

/**
 * 二叉平衡树
 * @param {Function} compartor 重复数据的比较器
 * @param {Boolean}  ifMerge   是否将插入的数据合并到节点
 */
function AVLTree(compartor, ifMerge) {
    this.root = null;
    this.first = null; //最小的节点
    this.last = null; //最大的节点
    this.compartor = compartor || function(arg1, arg2) { return arg1 - arg2; };
    this.ifMerge = ifMerge;
}

var _proto = AVLTree.prototype;

/**
 * 插入节点
 * @param  {[type]} key  节点的key
 * @param  {[type]} data 节点的数据
 * @return {Boolean}     插入是否成功
 */
_proto.insert = function(key, data) {
    var node = new AVLNode(key, data, this.ifMerge);
    if (!this.root) {
        this.root = node;
        this.first = this.root;
        this.last = this.root;
        return node;
    }
    var result = this._insert(this.root, node);
    if (result) {
        if (this.compartor(this.first.key, key) > 0) {
            this.first = node;
        }
        if (this.compartor(this.first.key, key) < 0) {
            this.last = node;
        }
    }
    result = result && node;
    return result;
}

/**
 * 删除节点
 * @param  {[type]}   key     需要删除的节点的key
 * @param  {Boolean}  ifAll   是否删除所有符合的结点
 * @return {Array|AVLNode}    被删除后的点
 */
_proto.delete = function(key, ifAll) {
    var result = [];
    var _result = this._delete(this.root, key);
    while (_result) {
        result.push(_result);
        if (_result.pre) {
            _result.pre.next = _result.next;
        } else {
            this.first = _result.next;
        }
        if (_result.next) {
            _result.next.pre = _result.pre;
        } else {
            this.last = _result.pre;
        }
        if (ifAll) {
            _result = this._delete(this.root, key);
        } else {
            result = _result;
            break;
        }
    }
    if (!this.root) {
        this.first = null;
        this.last = null;
    }
    return result;
}

/**
 * 查找节点
 * @param  {[type]}   key     需要查找的节点的key
 * @param  {Boolean}  ifAll   是否返回所有结果
 * @return {Array|AVLNode}    查找结果
 */
_proto.search = function(key, ifAll) {
    var result = [];
    var _result = this._search(this.root, key);
    if (ifAll) {
        while (_result) {
            result.push(_result);
            if (_result.next && this.compartor(_result.next.key, _result.key)) {
                _result = _result.next;
            } else {
                break;
            }
        }
    } else {
        result = _result;
    }
    return result;
}

/**
 * 插入节点
 * @param  {AVLNode} root 子树的根节点
 * @param  {AVLNode} node 待插入的节点
 * @return {Boolean}      插入是否成功
 */
_proto._insert = function(root, node) {
    if (this.compartor(root.key, node.key) == 0) {
        return false;
    } else if (this.compartor(root.key, node.key) > 0) { //插入左子树
        if (root.lChild) { //在左子树上递归插入
            if (!this._insert(root.lChild, node)) {
                return false;
            }
            this._checkBalance(root);
        } else { //插入叶子节点
            root.lChild = node;
            node.pNode = root;
        }
    } else { //插入右子树
        if (root.rChild) { //在右子树上递归插入
            if (!this._insert(root.rChild, node)) {
                return false;
            }
            this._checkBalance(root);
        } else { //插入叶子节点
            root.rChild = node;
            node.pNode = root;
        }
    }
    //生成中序遍历前后件关系
    if (!node.next && this.compartor(root.key, node.key) > 0) {
        node.next = root;
        root.pre = node;
    } else if (!node.pre && this.compartor(root.key, node.key) < 0) {
        node.pre = root;
        root.next = node;
    }
    //更新节点的高度
    this._setHeight(root);

    return true;
}

/**
 * 删除节点
 * @param  {AVLNode} root   子树的根节点 
 * @param  {[type]}  key    待删除的节点的key
 * @return {Boolean}        是否删除成功
 */
_proto._delete = function(root, key) {
    if (!root) {
        return false;
    }
    if (this.compartor(root.key, key) == 0) {
        if (!root.lChild && !root.rChild) { //叶子节点，直接删除
            if (this.root == root) {
                this.root = null;
            } else {
                if (root.pNode.lChild == root) {
                    root.pNode.lChild = null;
                } else {
                    root.pNode.rChild = null;
                }
                this._setHeight(root.pNode);
            }
            return root;
        } else if (!root.lChild || !root.rChild) { //没有右子树或者没有左子树
            var child = root.lChild || root.rChild;
            if (this.root == root) {
                this.root = child;
                this.root.pNode = null;
            } else {
                if (root.pNode.lChild == root) {
                    root.pNode.lChild = child;
                } else {
                    root.pNode.rChild = child;
                }
                child.pNode = root.pNode;
                this._setHeight(root.pNode);
            }
            return root;
        } else if (this._getHeight(root.lChild) > this._getHeight(root.rChild)) { //用左子树上最大的节点代替root
            var rChild = root.lChild.rChild;
            var lChild = root.lChild;
            while (rChild && rChild.rChild) {
                rChild = rChild.rChild;
            }
            if (!rChild) {
                rChild = lChild;
            }
            //交换root和lChild
            this._change(root, rChild);
            //保证删除的节点没有左子树，或者没有右子树，用来递归更新所有需要更新高度的节点
            var result = this._delete(root.lChild, key);
            return result;
        } else { //用右子树上最小的节点代替root
            var lChild = root.rChild.lChild;
            var rChild = root.rChild;
            while (lChild && lChild.lChild) {
                lChild = lChild.lChild;
            }
            if (!lChild) {
                lChild = rChild;
            }
            //交换root和lChild
            this._change(root, lChild);
            //保证删除的节点没有左子树，或者没有右子树，用来递归更新所有需要更新高度的节点
            var result = this._delete(root.rChild, key);
            return result;
        }
    } else if (this.compartor(root.key, key) > 0) { //在左子树上递归删除
        var result = this._delete(root.lChild, key);
        if (!result) {
            return false;
        }
        this._checkBalance(root);
        this._setHeight(root);
        return result;
    } else { //在右子树上删除
        var result = this._delete(root.rChild, key);
        if (!result) {
            return false;
        }
        this._checkBalance(root);
        this._setHeight(root);
        return result;
    }
}

/**
 * 搜索节点
 * @param  {AVLNode} root   子树的根节点 
 * @param  {[type]}  key    待查找的节点的key
 * @return {AVLNode}        查找结果
 */
_proto._search = function(root, key) {
    if (!root) {
        return false;
    }
    if (this.compartor(root.key, key) == 0) {
        return root;
    } else if (this.compartor(root.key, key) > 0) {
        return this._search(root.lChild, key);
    } else {
        return this._search(root.rChild, key);
    }
}

//左旋转
_proto._lRotate = function(node) {
    var rc = node.rChild;
    rc.pNode = node.pNode;
    node.rChild = rc.lChild;
    rc.lChild && (rc.lChild.pNode = node);
    rc.lChild = node;
    if (node == this.root) {
        this.root = rc;
    } else if (node.pNode) {
        if (node.pNode.lChild == node) {
            node.pNode.lChild = rc;
        } else {
            node.pNode.rChild = rc;
        }
    }
    node.pNode = rc;
    this._setHeight(node);
    this._setHeight(rc);
}

//右旋转
_proto._rRotate = function(node) {
    var lc = node.lChild;
    lc.pNode = node.pNode;
    node.lChild = lc.rChild;
    lc.rChild && (lc.rChild.pNode = node);
    lc.rChild = node;
    if (node == this.root) {
        this.root = lc;
    } else if (node.pNode) {
        if (node.pNode.lChild == node) {
            node.pNode.lChild = lc;
        } else {
            node.pNode.rChild = lc;
        }
    }
    node.pNode = lc;
    this._setHeight(node);
    this._setHeight(lc);
}

//先左旋转，再右旋转
_proto._lrRotate = function(node) {
    this._lRotate(node.lChild);
    return this._rRotate(node);
}

//先右旋转，再左旋转
_proto._rlRotate = function(node) {
    this._rRotate(node.rChild);
    return this._lRotate(node);
}

/**
 * 交换两个节点
 * @param  {AVLNode} node1 
 * @param  {AVLNode} node2
 */
_proto._change = function(node1, node2) {
    var props = ['pre', 'next', 'lChild', 'rChild', 'pNode', 'height'];
    for (var key in node1) {
        if (props.indexOf(key) == -1) {
            _change(key);
        }
    }

    function _change(key) {
        var tmp = node1[key];
        node1[key] = node2[key];
        node2[key] = tmp;
    }
}

//检查并调整树
_proto._checkBalance = function(node) {
    if (node.rChild && (this._getHeight(node.rChild) - this._getHeight(node.lChild) == 2)) { //不平衡，需要调整
        var rc = node.rChild;
        if (this._getHeight(node.rChild.rChild) > this._getHeight(node.rChild.lChild)) { //左旋转
            this._lRotate(node);
        } else { //先右旋转，再左旋转
            this._rlRotate(node);
        }
    } else if (node.lChild && (this._getHeight(node.lChild) - this._getHeight(node.rChild) == 2)) { //不平衡，需要调整
        var lc = node.lChild;
        if (this._getHeight(node.lChild.lChild) > this._getHeight(node.lChild.rChild)) { //右旋转
            this._rRotate(node);
        } else { //先左旋转，再右旋转
            this._lrRotate(node);
        }
    }
}

//获取树的高度
_proto._getHeight = function(node) {
    if (!node) {
        return 0;
    }
    return node.height;
}

//设置树的高度
_proto._setHeight = function(node) {
    var height = Math.max(this._getHeight(node.lChild), this._getHeight(node.rChild)) + 1;
    //如果是叶子节点，不用加1
    if (!node.lChild && !node.rChild) {
        height = 0;
    }
    node.height = height;
}

export default AVLTree