////////////
// 多行匹配节点 //
////////////
export class TokenNode {
    constructor(line, start, end, token, type, regIndex) {
        this.line = line;
        this.start = start;
        this.end = end;
        this.token = token;
        this.type = type; //1.开始，2.结束
        this.regIndex = regIndex;
        this.next = null;
        this.skipNext = null;
        this.pre = null;
        this.skipPre = null;
        this.preToken = null;
        this.suffixToken = null;
    }
}

///////////
// 多行匹配链 //
///////////
export class TokenLink {
    /**
     * @param {Number} skipGap 跳表最小间隔
     */
    constructor(skipGap) {
        this.skipGap = skipGap;
        this.head = new TokenNode(0); //链表头
        this.last = this.head; //链表头
        this.skipHead = this.head; //跳表头
        this.skipLast = this.head; //跳表尾
    }
    //插入一个节点
    insert(tokenNode) {
        var skipLast = this.skipLast;

        if (tokenNode.line <= 0) {
            throw new Error('tokenNode.line can not less than 1');
        }

        //寻找跳表头
        while (skipLast && skipLast.line > tokenNode.line) {
            skipLast = skipLast.skipPre;
        }

        //插入跳表
        if (tokenNode.line - skipLast.line >= this.skipGap) {
            if (skipLast.skipNext) {
                if (skipLast.skipNext.line - tokenNode.line >= this.skipGap) {
                    tokenNode.skipNext = skipLast.skipNext;
                    skipLast.skipNext.skipPre = tokenNode;
                    skipLast.skipNext = tokenNode;
                    tokenNode.skipPre = skipLast;
                }
            } else {
                this.skipLast.skipNext = tokenNode;
                tokenNode.skipPre = this.skipLast;
                this.skipLast = tokenNode;
            }
        }

        //寻找链表插入位置
        while (skipLast && (skipLast.line < tokenNode.line || skipLast.line == tokenNode.line && skipLast.start < tokenNode.start)) {
            skipLast = skipLast.next;
        }

        if (skipLast) {
            skipLast.pre.next = tokenNode;
            tokenNode.pre = skipLast.pre;
            tokenNode.next = skipLast;
            skipLast.pre = tokenNode;
        } else {
            tokenNode.pre = this.last;
            this.last.next = tokenNode;
            this.last = tokenNode;
        }
    }
    //根据行号删除节点
    del(line) {
        if (typeof line === 'number') {
            var tokenNode = this.find(line);
            while (tokenNode && tokenNode.line <= line) {
                if (tokenNode.next) {
                    tokenNode.next.pre = tokenNode.pre;
                }
                tokenNode.pre.next = tokenNode.next;
                if (tokenNode == this.last) {
                    this.last = tokenNode.pre;
                }
                //删除跳表项
                if (tokenNode.skipNext) {
                    tokenNode.skipNext.skipPre = tokenNode.skipPre;
                    tokenNode.skipPre.skipNext = tokenNode.skipNext;
                } else if (tokenNode == this.skipLast) {
                    this.skipLast = tokenNode.skipPre;
                    this.skipLast.skipNext = null;
                }
                tokenNode = tokenNode.next;
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
}