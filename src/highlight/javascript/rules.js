import Util from "../../common/util"

/*
 * @Author: lisong
 * @Date: 2020-11-11 14:17:21
 * @Description: 
 */
export const rules = [{
    reg: /\bwindow\b|\bdocument\b/g,
    className: 'local-var',
    level: 0
}, {
    reg: /\bthis\b|\bself\b/g,
    className: 'this',
    level: 0
}, {
    reg: /\+|\-|\*|\/|\=|\!|>|<|\&|\||\?/g,
    className: 'oprator',
    level: 0
}, {
    reg: /\b\d+\b|\b0[xX][a-zA-Z0-9]*?\b|\bundefined\b|\bnull\b/g,
    className: 'number',
    level: 0
}, {
    reg: /\bvar\b/g,
    className: 'type',
    level: 0
}, {
    reg: /([\$_a-zA-Z][\$_a-zA-Z0-9]*?)(?=\()/g, //ie. test(),.test()
    className: 'exec-function',
    level: 0
}, {
    reg: /\s*?class\s*?([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?\{/g, //ie. calss Test{}
    className: 'class-name',
    level: 0
}, {
    reg: /([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?(?=\([^\)]*?\)\s*?\{)/g, //ie. test(){}
    className: 'function-name',
    level: 1
}, {
    reg: /function\s*([\$_a-zA-Z][\$_a-zA-Z0-9]*?)/g, //ie. function test
    className: 'function-name',
    level: 1
}, {
    reg: /\s*?new\s*?([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?\(/g, //ie. new Test()
    className: 'new-class',
    level: 1
}, {
    reg: /\bconst\b|\bcontinue\b|\bbreak\b|\bswitch\b|\bcase\b|\bdo\b|\belse\b|\bfor\b|\bif\b|\bnew\b|\breturn\b|\bfrom\b|\btypeof|\beach\b|\bin\b|\bimport\b|\bexport\b|\bdefault\b/g,
    className: 'key',
    level: 2
}, {
    reg: /\b(class)(?=\s*?[\$_a-zA-Z][\$_a-zA-Z0-9]*?\s*\{)/g, //class {}
    className: 'class',
    level: 2
}, {
    reg: /\bfunction\b/g,
    className: 'function',
    level: 2
}]

export const pairRules = [
    //多行注释
    {
        startReg: /\/\*/g,
        endReg: /\*\//g,
        className: 'pair-comment'
    },
    //字符串``
    {
        startReg: /`/g,
        endReg: /`/g,
        className: 'pair-string'
    },
    //字符串''
    {
        startReg: /'/g,
        endReg: /'/g,
        className: 'single-quotation-string'
    },
    //字符串"""
    {
        startReg: /"/g,
        endReg: /"/g,
        className: 'double-quotation-string'
    }
]

export const seniorRules = [{
    reg: /\/\/[\s\S]*$/g,
    className: 'comment',
    level: 1
}];