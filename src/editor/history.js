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
        this.record = []; //历史操作记录
        this.nowIndex = -1; //当前记录索引
        this.closeFolds = []; //折叠记录
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
            self = this;
        //折叠记录不更改历史栈
        if (op != 'fold' && op != 'unFold') {
            var delNode = this.record.slice(this.nowIndex + 1);
            //新增历史时删除之后的历史记录
            this.record = this.record.slice(0, this.nowIndex + 1);
            //保留折叠记录
            for (var i = 0; i < delNode.length; i++) {
                if (delNode[i].op == 'fold') {
                    this.record.push(delNode[i]);
                }
            }
        }
        if (op == 'unFold') { //展开操作
            doUnfold();
        } else if (op == 'fold') { //折叠操作
            doFold();
        } else if (preNode && preNode.op == 'add' && op == 'add' &&
            node.timestamp - preNode.timestamp < 200 &&
            preNode.endPos.line == startPos.line &&
            preNode.endPos.column == startPos.column) { //两次插入操作合并
            preNode.content += content;
            preNode.endPos = endPos;
        } else { //添加新记录到历史栈
            this.record.push(node);
            this.nowIndex = this.record.length - 1;
        }

        //展开操作
        function doUnfold() {
            for (var i = 0; i < self.record.length; i++) {
                var record = self.record[i];
                if (record.outFold && record.outFold.startPos.line == startPos.line) {
                    //历史操作区域相对坐标还原成绝对坐标
                    record.endPos.line = record.endPos.line - record.startPos.line + record.outFold.startPos.line + record.relativeLine;
                    record.startPos.line = record.outFold.startPos.line + record.relativeLine;
                    delete record.outFold;
                }
            }
            for (var i = 0; i < self.closeFolds.length; i++) {
                if (self.closeFolds[i].startPos.line > startPos.line) { 
                    //重置其后折叠行记录的行号
                    self.closeFolds[i].startPos.line += endPos.line - startPos.line;
                    self.closeFolds[i].endPos.line += endPos.line - startPos.line;
                }
            }
            _delColseFold(node);
        }

        //折叠操作
        function doFold() {
            for (var i = 0; i < self.record.length; i++) {
                var record = self.record[i];
                //当前折叠区域包括历史记录对应的区域
                if (!record.outFold && record.startPos.line > startPos.line && record.startPos.line <= endPos.line) {
                    record.outFold = node;
                    node.relRecord = record;
                    record.relativeLine = record.startPos.line - startPos.line;
                    //当前折叠区域包括旧的折叠区域，旧的折叠区域又包括了历史记录区域
                } else if (record.outFold && record.outFold.startPos.line > startPos.line && record.outFold.startPos.line <= endPos.line) {
                    _delColseFold(record.outFold);
                    record.relativeLine += record.outFold.startPos.line - startPos.line;
                    record.outFold = node;
                    node.relRecord = record;
                    //折叠区域之后的历史记录区域
                } else if (record.startPos.line > startPos.line) {
                    record.startPos.line -= endPos.line - startPos.line;
                    record.endPos.line -= endPos.line - startPos.line;
                }
            }
            for (var i = 0; i < self.closeFolds.length; i++) {
                if (self.closeFolds[i].startPos.line > startPos.line) { 
                    //重置其后折叠行记录的行号
                    self.closeFolds[i].startPos.line -= endPos.line - startPos.line;
                    self.closeFolds[i].endPos.line -= endPos.line - startPos.line;
                }
            }
            self.closeFolds.push(node);
        }

        //删除折叠记录
        function _delColseFold(record) {
            for (var i = 0; i < self.closeFolds.length; i++) {
                if (record.startPos.line == self.closeFolds[i].startPos.line) {
                    self.closeFolds.splice(i, 1);
                    i--;
                }
            }
        }
    }
    /**
     * 执行命令
     * @param  {Node}   node     历史节点
     * @param  {String} _commond 命令
     */
    commond(node, _commond) {
        var self = this;
        if (_commond == 'redo') { //重做
            switch (node.op) {
                case 'add':
                    _add(node);
                    break;
                case 'del':
                    _del(node);
                    break;
            }
        } else if (_commond == 'undo') { //撤销
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

        //包含当前历史操作区域的折叠需要展开
        function _unFod(node) {
            node.outFold && self.editor.unFold(outFold.startPos.line);
        }
    }
}

export default History