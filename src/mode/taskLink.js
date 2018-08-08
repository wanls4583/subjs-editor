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
        this.insertCache = [];
    }
    //执行
    process() {
        var startTime = new Date().getTime(),
            endTime = startTime,
            self = this;
        clearTimeout(this.timer);
        while (endTime - startTime <= 17) {
            if (this.insertCache.length) {
                for (var i = 0, length = this.insertCache.length; i < 100 && i < length; i++) {
                    this._insert(this.insertCache.pop())
                }
            }
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
        if (this.head.next || this.insertCache.length) {
            this.timer = setTimeout(function() {
                self.process();
            }, 0);
        }
    }
    /**
     * 添加待处理行
     * @param  {Number} line   待处理行
     * @param  {Boolean} force 强制同步
     */
    insert(line, force) {
        if (force) {
            this._insert(line);
        } else {
            this.insertCache.push(line);
        }
    }
    //添加待处理行
    _insert(line) {
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
        var self = this;
        if (typeof line === 'number') {
            var taskNode = this.find(line);
            while (taskNode && taskNode.line <= line) {
                _del(taskNode);
                taskNode = taskNode.next;
            }
        } else if (typeof line === 'object') {
            _del(line);
        }

        function _del(taskNode) {
            if (taskNode.next) {
                taskNode.next.pre = taskNode.pre;
            }
            taskNode.pre.next = taskNode.next;
            if (taskNode == self.last) {
                self.last = taskNode.pre;
            }
            if (taskNode == self.nowTask) {
                self.nowTask = self.nowTask.pre;
            }
            //删除跳表项
            if (taskNode.skipNext) {
                taskNode.skipNext.skipPre = taskNode.skipPre;
                taskNode.skipPre.skipNext = taskNode.skipNext;
            } else if (taskNode == self.skipLast) {
                self.skipLast = taskNode.skipPre;
                self.skipLast.skipNext = null;
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
    /**
     * 对所有任务行操作
     * @param  {Function} callback 回调函数
     * @param  {Function} callback 回调函数
     */
    eachTask(callback,baseLine) {
        baseLine = baseLine || 0;
        for (var i = this.insertCache.length; i >= 0; i--) {
            if(this.insertCache[i] > baseLine){
                callback(this.insertCache, i);
            }
        }
        
        var skipHead = this.skipHead;
        //寻找跳表头
        while (skipHead && skipHead.line < baseLine) {
            skipHead = skipHead.skipNext;
        }

        skipHead = skipHead && skipHead.skipPre || this.skipLast;

        while (skipHead && skipHead.line <= baseLine) {
            skipHead = skipHead.next;
        }
        while (skipHead && (skipHead = skipHead.next)) {
            callback(skipHead);
        }
    }
}

export default TaskLink;