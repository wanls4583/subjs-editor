//////////////
// 当行匹配检测任务 //
//////////////
class TaskNode {
    /**
     * @param {Number} line 需要检测的行
     */
    constructor(line) {
        this.line = line;
        this.pre = null;
        this.next = null;
        this.skipPre = null;
        this.skipNext = null;
    }
}

///////////
// 任务处理器 //
///////////
class TaskLink {
    /**
     * @param {Number} skipGap      跳表最小间隔
     * @param {Object} mode         语法高亮对象
     */
    constructor(skipGap, mode) {
        this.skipGap = skipGap;
        this.mode = mode;
        this.head = new TaskNode(0);
        this.last = this.head;
        this.skipHead = this.head;
        this.skipLast = this.head;
        this.nowTask = this.head;
    }
    //执行
    process() {
        var startTime = new Date().getTime(),
            endTime = startTime,
            self = this;
        clearTimeout(this.timer);
        while (endTime - startTime <= 17) {
            if (!this.nowTask || this.nowTask.line < 1) {
                this.nowTask = this.last;
            }
            if (this.nowTask && this.nowTask.line > 0) {
                this.mode.updateLine(this.nowTask.line);
                this.nowTask = this.nowTask.pre;
                this.del(this.nowTask.next);
            }
            endTime = new Date().getTime();
        }
        if (this.head.next) {
            this.timer = setTimeout(function() {
                self.process();
            }, 0);
        }
    }
    //添加待处理行
    insert(line) {
        var taskNode = this.find(line);
        if (!taskNode) {
            var skipLast = this.skipLast;
            taskNode = new TaskNode(line);

            //寻找跳表头
            while (skipLast && skipLast.line > taskNode.line) {
                skipLast = skipLast.skipPre;
            }

            //插入跳表
            if (taskNode.line - skipLast.line >= this.skipGap) {
                if (skipLast.skipNext) {
                    if (skipLast.skipNext.line - taskNode.line >= this.skipGap) {
                        taskNode.skipNext = skipLast.skipNext;
                        skipLast.skipNext.skipPre = taskNode;
                        skipLast.skipNext = taskNode;
                        taskNode.skipPre = skipLast;
                    }
                } else {
                    this.skipLast.skipNext = taskNode;
                    taskNode.skipPre = this.skipLast;
                    this.skipLast = taskNode;
                }
            }

            //寻找链表插入位置
            while (skipLast && skipLast.line < taskNode.line) {
                skipLast = skipLast.next;
            }
            if (skipLast) {
                skipLast.pre.next = taskNode;
                taskNode.pre = skipLast.pre;
                taskNode.next = skipLast;
                skipLast.pre = taskNode;
            } else {
                taskNode.pre = this.last;
                this.last.next = taskNode;
                this.last = taskNode;
            }
        }
    }
    //删出一个待处理行
    del(line) {
        if (typeof line === 'number') {
            var taskNode = this.find(line);
            while (taskNode && taskNode.line <= line) {
                if (taskNode.next) {
                    taskNode.next.pre = taskNode.pre;
                }
                taskNode.pre.next = taskNode.next;
                if (taskNode == this.last) {
                    this.last = taskNode.pre;
                }

                //删除跳表项
                if (taskNode.skipNext) {
                    taskNode.skipNext.skipPre = taskNode.skipPre;
                    taskNode.skipPre.skipNext = taskNode.skipNext;
                } else if (taskNode == this.skipLast) {
                    this.skipLast = taskNode.skipPre;
                    this.skipLast.skipNext = null;
                }
                taskNode = taskNode.next;
            }
        } else if (typeof line === 'object') {
            if (line.next) {
                line.next.pre = line.pre;
            }
            line.pre.next = line.next;
            if (line == this.last) {
                this.last = line.pre;
            }
            //删除跳表项
            if (line.skipNext) {
                line.skipNext.skipPre = line.skipPre;
                line.skipPre.skipNext = line.skipNext;
            } else if (line == this.skipLast) {
                this.skipLast = line.skipPre;
                this.skipLast.skipNext = null;
            }
        }
    }
    //根据行号查找节点
    find(line) {
        var skipHead = this.skipHead;
        //寻找跳表头
        while (skipHead && skipHead.line < line) {
            skipHead = skipHead.skipNext;
        }

        skipHead = skipHead && skipHead.skipPre || this.skipLast;

        while (skipHead && skipHead.line <= line) {
            if (skipHead.line == line) {
                return skipHead;
            }
            skipHead = skipHead.next;
        }

        return null;
    }
    //设置优先处理行
    setPriorLine(endLine) {
        var skipHead = this.skipHead;
        //寻找跳表头
        while (skipHead && skipHead.line < endLine) {
            skipHead = skipHead.skipNext;
        }

        skipHead = skipHead && skipHead.skipPre || this.skipLast;

        while (skipHead && skipHead.line < endLine) {
            skipHead = skipHead.next;
        }

        if (skipHead) {
            this.nowTask = skipHead;
        }
    }
}

export default TaskLink;