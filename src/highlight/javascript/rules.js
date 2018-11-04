import Util from '../../common/util.js';

//多行注释 ie. /*....*/
export const commentRules = [{
    pre: /\/\*/g,
    pre_exclude: [Util.excludeStrReg(/\/\*/), /\*\/\*/g, /\/\/[^\n]*/g],
    suffix: /\*\//g,
    suffix_exclude: [Util.excludeStrReg(/\*\//), /\/\/[^\n]*/g],
    token: 'pair_comment'
}]
//单行匹配
export const rules = [{
    reg: /([\$_a-zA-Z][\$_a-zA-Z0-9]*?)(?=\()/g, //ie. test(),.test()
    token: 'function'
}, {
    reg: /([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?(?=\([^\)]*?\)\s*?\{)/g, //ie. test(){}
    exclude: /(?:for|if|else|while|switch)\s*?(?=\([^\)]*?\)\s*?\{)/g,
    token: 'function_name',
}, {
    reg: /\s*?class\s*?([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?\{/g, //ie. calss Test{}
    token: 'function_name'
}, {
    reg: /[\$_a-zA-Z][\$_a-zA-Z0-9]*?\s*?\(([^\)]*?)\)\s*?\{/g, //ie. test(arg1,arg2){}
    exclude: /(?:for|if|else|while|switch)\s*?\(([^\)]*?)\)\s*?\{/g,
    callback: Util.execArgsReg,
    token: 'function_arg',
}, {
    reg: /\bthis\b|\bself\b/g,
    token: 'this'
},{
    reg: /\bcontinue\b|\bbreak\b|\bswitch\b|\bcase\b|\bdo\b|\belse\b|\bfor\b|\bif\b|\bnew\b|\breturn\b|\bfrom\b|\btypeof|\beach\b|\bin\b|\bimport\b|\bexport\b|\bdefault\b/g,
    token: 'key'
}, {
    reg: /\s*?new\s*?([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?\(/g, //ie. new Test()
    token: 'class'
}, {
    reg: /\bclass\b|\bwindow\b|\bdocument\b|\bconst\b/g,
    token: 'local'
}, {
    reg: /\+|\-|\*|\/|\=|\!|>|<|\&|\||\?/g,
    token: 'oprator'
}, {
    reg: /\b\d+\b|\b0[xX][a-zA-Z0-9]*?\b|\bundefined\b|\bnull\b/g,
    token: 'number'
}, {
    reg: /\bvar\b|\bfunction\b/g,
    token: 'type'
}, {
    reg: / {4}(?= )/g,
    exclude: [/[^ ]+? {4}[\s\S]*$/g],
    token: 'indent'
}, {
    reg: /'[^']*?'|"[^"]*?"/g,
    token: 'string'
}, {
    reg: /\/\/[^\n]*/g,
    token: 'comment'
}]