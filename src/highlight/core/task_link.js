import AVL from '../../avl/avl.js';

///////////
// 任务处理器 //
///////////
class TaskLink {
    /**
     * @param {Number} minUnit      最新执行单元
     * @param {Object} processCb    回调
     * @param {Object} order        处理顺序,默认倒叙{fontToBack: 顺序}
     * @param {Object} onTaskDone   任务列表完成回调
     */
    constructor(minUnit, processCb, order, onTaskDone) {
        this.processCb = processCb;
        this.minUnit = minUnit || 100;
        this.avl = new AVL();
        this.order = order;
        this.onTaskDone = onTaskDone || function(){};
    }
    //执行
    process() {
        var self = this,
            startTime = new Date().getTime(),
            endTime = startTime;
        clearTimeout(this.timer);
        //避免浏览器阻塞
        for (var i = 0; i < this.minUnit && endTime - startTime < 17; i++) {
            if (!this.nowTask || this.nowTask.data.line < 1) {
                this.nowTask = this.avl.last;
                if (this.order == 'frontToBack') {
                    this.nowTask = this.avl.first;
                }
            }
            if (this.nowTask && this.nowTask.data.line > 0) {
                var line = this.nowTask.data.line;
                var deled = this.avl.delete(line);
                if (this.order == 'frontToBack') {
                    //删除操作只会删除叶子节点，下一个需要执行的任务可能依然为nowTask节点(数据已更改)
                    if (deled.pre != this.nowTask) {
                        this.nowTask = this.nowTask.next;
                    }
                } else {
                    if (deled.next != this.nowTask) {
                        this.nowTask = this.nowTask.pre;
                    }
                }
                this.processCb(line);
            }
            endTime = new Date().getTime();
        }
        //继续下一个任务
        if (this.avl.root) {
            this.timer = setTimeout(function() {
                self.process();
            }, 0);
        } else {
            this.onTaskDone();
        }
    }
    //情况任务列表
    empty() {
        this.avl.root = null;
        clearTimeout(this.timer);
    }
    /**
     * 添加待处理行
     * @param  {Number} line   待处理行
     */
    insert(line) {
        return this.avl.insert(line, { line: line });
    }
    //删出一个待处理行
    del(line) {
        var nowLine = this.nowTask && this.nowTask.data.line;
        var deled = this.avl.delete(line);
        if(nowLine == line) {
            if (this.order == 'frontToBack') {
                //删除操作只会删除叶子节点，下一个需要执行的任务可能依然为nowTask节点(数据已更改)
                if (deled.pre != this.nowTask) {
                    this.nowTask = this.nowTask.next;
                }
            } else {
                if (deled.next != this.nowTask) {
                    this.nowTask = this.nowTask.pre;
                }
            }
        }
    }
    //根据行号查找节点
    find(line) {
        return this.avl.search(line);
    }
    /**
     * 设置优先处理行
     * @param {Number}  endLine   末尾优先行
     * @param {Boolean} ifProcess 是否立刻处理
     */
    setPriorLine(endLine, ifProcess) {
        var root = this.avl.root;
        var near = null; //最接近且大于 endLine 的节点
        if (this.avl.last && this.avl.last.key > endLine) {
            while (root) {
                if (!near || (root.key < near.key && root.key > endLine)) {
                    near = root;
                }
                if (root.key > endLine) {
                    root = root.lChild;
                } else if (root.key < endLine) {
                    root = root.rChild;
                } else {
                    near = root;
                    break;
                }
            }
        } else {
            near = this.avl.last;
        }
        if (near) {
            this.nowTask = near;
        }
        if (ifProcess) {
            this.process();
        }
    }
    /**
     * 对所有任务行操作
     * @param  {Function} callback 回调函数
     * @param  {Function} callback 回调函数
     */
    eachTask(callback, baseLine) {
        baseLine = baseLine || 0;
        var head = this.avl.first;
        while (head) {
            callback(head);
            head = head.next;
        }
    }
    /**
     * 检测所有任是否已经完成
     * @return {Boolean} 所有任是否已经完成
     */
    ifDone() {
        return !this.avl.root;
    }
}

export default TaskLink;