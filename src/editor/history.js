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
        var node = this.record[this.nowIndex],
            self = this;
        if (node) {
            this.nowIndex--;
            if (node.op == 'add') {
                _del(node);
            } else if (node.op == 'del') {
                _add(node);
            }
        }

        function _add(node) {
            self.editor.setCursorPos(node.startPos);
            self.editor.insertContent(node.content, true);
        }

        function _del(node) {
            self.editor.deleteContent(node.startPos, node.endPos, true);
        }
    }
    //重做
    redo() {
        var node = this.record[this.nowIndex + 1],
            self = this;
        if (node) {
            this.nowIndex++;
            if (node.op == 'add') {
                _add(node);
            } else if (node.op == 'del') {
                _del(node);
            }
        }

        function _add(node) {
            self.editor.setCursorPos(node.startPos);
            self.editor.insertContent(node.content, true);
        }

        function _del(node) {
            self.editor.deleteContent(node.startPos, node.endPos, true);
        }
    }
    //添加记录
    push(op, startPos, endPos, content) {
        var preNode = this.record[this.nowIndex];
        var node = new Node(op, startPos, endPos, content);
        this.record = this.record.slice(0, this.nowIndex + 1);
        //两次插入操作合并
        if (preNode && node.timestamp - preNode.timestamp < 200 &&
            preNode.endPos.line == node.startPos.line &&
            preNode.endPos.column == node.startPos.column) {
            preNode.content += content;
            preNode.endPos = endPos;
        } else {
            this.record.push(node);
            this.nowIndex = this.record.length - 1;
        }
    }
    //执行
    exec(node) {

    }
}

export default History