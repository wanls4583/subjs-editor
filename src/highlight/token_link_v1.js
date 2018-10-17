import AVL from '../avl/avl.js';

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
        this.avl = new AVL(function(arg1,arg2){ return arg1.start - arg2.start; }, true);
    }
    //插入一个节点
    insert(tokenNode) {
        return this.avl.insert(tokenNode.line, tokenNode);
    }
    //根据行号删除节点
    del(line) {
        this.avl.delete(line);
    }
    //根据行号查找节点
    find(line) {
        return  this.avl.search(line);
    }
}