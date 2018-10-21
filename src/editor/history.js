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
        this.length = endPos.line - startPos.line; //完整删除的行或者完整新增的行数
        this.relativeLine = 0; //相对行号
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
        window.test = this;
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
                if (record.outFold) {
                    if (record.outFold.startPos.line == startPos.line) {
                        //历史操作区域相对坐标还原成绝对坐标
                        record.startPos.line = record.outFold.startPos.line + record.relativeLine;
                        record.endPos.line = record.startPos.line + record.length;
                        record.relativeLine = 0;
                        delete record.outFold;
                    }
                } else {
                    if (record.startPos.line > startPos.line) {
                        record.startPos.line += node.length;
                        record.endPos.line = record.startPos.line + record.length;
                    } else if (record.endPos.line > startPos.line) {
                        record.endPos.line = record.endPos.line + node.length;
                        record.length += node.length;
                    }
                }
            }
            for (var i = 0; i < self.closeFolds.length; i++) {
                if (self.closeFolds[i].startPos.line > startPos.line) {
                    //重置其后折叠行记录的行号
                    self.closeFolds[i].startPos.line += node.length;
                    self.closeFolds[i].endPos.line += node.length;
                }
            }
            _delColseFold(node);
        }

        //折叠操作
        function doFold() {
            var innerRecordes = [];
            for (var i = 0; i < self.record.length; i++) {
                var record = self.record[i];
                if (record.outFold) {
                    //当前折叠区域包括旧的折叠区域，旧的折叠区域又包括了历史记录区域
                    if (record.outFold.startPos.line > startPos.line && record.outFold.startPos.line <= endPos.line) {
                        _delColseFold(record.outFold);
                        innerRecordes.push(record);
                    }
                } else {
                    //当前折叠区域包括历史记录对应的区域
                    if (record.startPos.line > startPos.line && record.startPos.line <= endPos.line) {
                        _delColseFold(record.outFold);
                        innerRecordes.push(record);
                    } else if (record.startPos.line > startPos.line) { //当前折叠区域之后的历史记录
                        record.startPos.line -= node.length;
                        record.endPos.line -= node.length;
                    } else if (record.endPos.line > startPos.line) { //历史记录区域包括当前折叠区域
                        record.endPos.line -= node.length;
                    }
                }
            }
            node.innerRecordes = innerRecordes;
            //设置历史记录的相对当前折叠记录的行号
            for (var i = 0; i < innerRecordes.length; i++) {
                _setRel(innerRecordes[i]);
            }
            for (var i = 0; i < innerRecordes.length; i++) {
                innerRecordes[i].outFold = node;
            }
            //重置当前折叠记录后面的折叠行记录的行号
            for (var i = 0; i < self.closeFolds.length; i++) {
                if (self.closeFolds[i].startPos.line > startPos.line) {
                    self.closeFolds[i].startPos.line -= node.length;
                    self.closeFolds[i].endPos.line -= node.length;
                }
            }
            self.closeFolds.push(node);
        }

        //设置历史记录相对外部折叠记录的行号
        function _setRel(record) {
            var distance = 0; //距离外部折叠记录的行数
            var innerRecordes = node.innerRecordes;
            var startLine = record.outFold ? record.outFold.startPos.line : record.startPos.line;
            var lines = []; //折叠区域内部可能包含多个记录，避免重复叠加
            for (var i = 0; i < innerRecordes.length; i++) {
                var innerRec = innerRecordes[i].outFold ? innerRecordes[i].outFold : innerRecordes[i];
                if (lines.indexOf(innerRec.startPos.line) == -1 && innerRec.startPos.line < startLine) {
                    distance += innerRec.length;
                    lines.push(innerRec.startPos.line);
                }
            }
            record.relativeLine += startLine - startPos.line + distance;
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
            node.outFold && self.editor.unFold(node.outFold.startPos.line);
            self.editor.setCursorPos(node.startPos);
            self.editor.insertContent(node.content, true);
        }

        function _del(node) {
            node.outFold && self.editor.unFold(node.outFold.startPos.line);
            self.editor.deleteContent(node.startPos, node.endPos, true);
        }
    }
}

export default History