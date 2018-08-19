/////////
//历史节点 //
/////////
class Node {
    constructor(op, startPos, endPos, content) {
        this.op = op;
        this.startPos = startPos;
        this.endPos = endPos;
        this.content = content;
        this.timestamp = new Date().getTime();
    }
}
///////////
//历史记录管理 //
///////////
class History {
    /**
     * @param  {Editor} editor 编辑器
     */
    constructor(editor) {
        this.editor = editor;
        this.record = [];
        this.nowIndex = -1;
    }
    //撤销
    undo() {
        var node = null;
        while (this.nowIndex > -1) {
            node = this.record[this.nowIndex];
            this.nowIndex--;
            if (node && node.op != 'fold' && node.op != 'unFold') {
                break;
            }
        }
        if (node) {
            this.commond(node, 'undo');
        }
    }
    //重做
    redo() {
        var node = null;
        while (this.nowIndex + 1 < this.record.length) {
            node = this.record[this.nowIndex + 1];
            this.nowIndex++;
            if (node && node.op != 'fold' && node.op != 'unFold') {
                break;
            }
        }
        if (node) {
            this.commond(node, 'redo');
        }

    }
    //添加记录
    push(op, startPos, endPos, content) {
        var preNode = this.record[this.nowIndex],
            node = new Node(op, startPos, endPos, content),
            delNode = this.record.slice(this.nowIndex + 1);
        this.record = this.record.slice(0, this.nowIndex + 1);
        //保留折叠记录
        for (var i = 0; i < delNode; i++) {
            if (delNode[i].op == 'fold') {
                this.record.push(delNode[i]);
            }
        }
        if (op == 'unFold') { //展开操作，不记录历史
            for (var i = 0; i < this.record.length; i++) {
                var record = this.record[i];
                //移除对应的折叠记录
                if (record.op == 'fold' && record.startPos.line == startPos.line) {
                    this.record.splice(i, 1);
                    break;
                } else if (!record.outFold && record.startPos.line > startPos.line) { //重置历史记录的行号
                    record.startPos.line += endPos.line - startPos.line;
                    record.endPos.line += endPos.line - startPos.line;
                }
            }
        } else if (op == 'fold') {
            //移除被覆盖的折叠记录
            for (var i = 0; i < this.record.length; i++) {
                var record = this.record[i];
                //移除对应的折叠记录
                if (record.op == 'fold' && record.startPos.line > startPos.line && record.startPos.line <= endPos.line) {
                    this.record.splice(i, 1);
                    record.del = true;
                    i--;
                }
            }
            //重置历史记录的行号
            for (var i = 0; i < this.record.length; i++) {
                var record = this.record[i];
                if (!record.outFold && record.startPos.line > startPos.line && record.endPos.line <= endPos.line) {
                    record.outFold = node;
                    record.relativeLine = record.startPos.line - startPos.line; //相对行号
                } else if (record.outFold && record.outFold.del) {
                    record.relativeLine = record.relativeLine + record.outFold.startPos.line - node.line; //相对行号
                    record.outFold = node;
                } else if (record.startPos.line > endPos.line) {
                    record.startPos.line -= endPos.line - startPos.line;
                    record.endPos.line -= endPos.line - startPos.line;
                }
            }
            this.record.push(node);
            this.nowIndex = this.record.length - 1;
        } else if (preNode && preNode.op == 'add' && op == 'add' &&
            node.timestamp - preNode.timestamp < 200 &&
            preNode.endPos.line == startPos.line &&
            preNode.endPos.column == startPos.column) { //两次插入操作合并
            preNode.content += content;
            preNode.endPos = endPos;
        } else {
            this.record.push(node);
            this.nowIndex = this.record.length - 1;
        }
    }
    /**
     * 执行命令
     * @param  {Node}   node     历史节点
     * @param  {String} _commond 命令
     */
    commond(node, _commond) {
        var self = this;
        if (_commond == 'redo') {
            switch (node.op) {
                case 'add':
                    _add(node);
                    break;
                case 'del':
                    _del(node);
                    break;
            }
        } else if (_commond == 'undo') {
            switch (node.op) {
                case 'add':
                    _del(node);
                    break;
                case 'del':
                    _add(node);
                    break;
            }
        }

        function _add(node) {
            _unFod(node);
            self.editor.setCursorPos(node.startPos);
            self.editor.insertContent(node.content, true);
        }

        function _del(node) {
            _unFod(node);
            self.editor.deleteContent(node.startPos, node.endPos, true);
        }
        //包含当前操作区域的折叠需要展开
        function _unFod(node) {
            if (node.outFold) {
                var index = self.record.indexOf(node);
                self.record.splice(index, 1);
                self.editor.unFold(node.startPos.line);
            }else{
                for (var i = 0; i < self.record.length; i++) {
                    var record = self.record[i];
                    //展开对应的折叠
                    if (record.op == 'fold' && record.startPos.line <= node.startPos.line && record.endPos.line >= node.startPos.line) {
                        self.editor.unFold(record.startPos.line);
                        self.record.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }
}

export default History