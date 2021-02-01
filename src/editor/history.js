/*
 * @Author: lisong
 * @Date: 2021-01-29 09:41:51
 * @Description: 
 */
import Util from '../common/util';
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
    }
    //撤销
    undo() {
        var node = this.record[this.nowIndex];
        if (node) {
            this.nowIndex--;
            this.commond(node, 'undo');
            if (node.op == Util.constData.OP_REPLACE) {
                this.undo();
            }
        }
    }
    //重做
    redo() {
        var node = this.record[this.nowIndex + 1];
        if (node) {
            this.nowIndex++;
            this.commond(node, 'redo');
            node = this.record[this.nowIndex + 1];
            if (node && node.op == Util.constData.OP_REPLACE) {
                this.redo();
            }
        }
    }
    //添加记录
    push(op, startPos, endPos, content) {
        var node = new Node(op, startPos, endPos, content);
        var preNode = this.record[this.nowIndex];
        //合并插入操作
        if (preNode && preNode.op == Util.constData.OP_ADD && op == Util.constData.OP_ADD &&
            node.timestamp - preNode.timestamp < 200 &&
            preNode.endPos.line == startPos.line &&
            preNode.endPos.column == startPos.column) { //两次插入操作合并
            preNode.content += content;
            preNode.endPos = endPos;
            return;
        }
        //合并删除操作
        if (preNode && preNode.op == Util.constData.OP_DEL && op == Util.constData.OP_DEL &&
            node.timestamp - preNode.timestamp < 200 &&
            preNode.startPos.line == endPos.line &&
            preNode.startPos.column == endPos.column) { //两次删除操作合并
            preNode.content = content + preNode.content;
            preNode.startPos = startPos;
            return;
        }
        if (this.nowIndex >= 0) {
            this.record = this.record.slice(0, this.nowIndex + 1);
        } else {
            this.record = [];
        }
        this.record.push(node);
        this.nowIndex = this.record.length - 1;
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
                case Util.constData.OP_ADD:
                case Util.constData.OP_REPLACE:
                    _add(node);
                    break;
                case Util.constData.OP_DEL:
                    _del(node);
                    break;
            }
        } else if (_commond == 'undo') { //撤销
            switch (node.op) {
                case Util.constData.OP_ADD:
                case Util.constData.OP_REPLACE:
                    _del(node);
                    break;
                case Util.constData.OP_DEL:
                    _add(node);
                    break;
            }
        }

        function _add(node) {
            self.editor.setCursorPos(node.startPos.line, node.startPos.column);
            self.editor.insertContent(node.content, true);
        }

        function _del(node) {
            self.editor.setRange(node.startPos, node.endPos);
            self.editor.deleteContent(null, true);
        }
    }
}

export default History