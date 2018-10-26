import AVL from '../../avl/avl.js';

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
    constructor() {
        this.avl = new AVL(function(arg1, arg2) {
            if (typeof arg1 == 'object' && typeof arg2 == 'object') {
                var result = arg1.line - arg2.line;
                if (!result) {
                    result = arg1.start - arg2.start;
                }
                return result;
            } else {
                arg1 = typeof arg1 == 'object' ? arg1.line : arg1;
                arg2 = typeof arg2 == 'object' ? arg2.line : arg2;
                return arg1 - arg2;
            }
        });
    }
    //插入一个节点
    insert(tokenNode) {
        return this.avl.insert({ line: tokenNode.line, start: tokenNode.start }, tokenNode);
    }
    /**
     * 删除节点
     * @param  {Object/Number} line  行号或者对象
     * @param  {Boolean}       ifAll 是否删除所有符合的节点
     * @return {Object/Array}        删除的节点
     */
    del(line, ifAll) {
        return this.avl.delete(line, ifAll);
    }
    /**
     * 查找节点
     * @param  {Object/Number} line  行号或者对象
     * @param  {Boolean}       ifAll 是否返回所有符合的节点
     * @return {Object/Array}        查找到的节点
     */
    find(line, ifAll) {
        return this.avl.search(line, ifAll);
    }
}