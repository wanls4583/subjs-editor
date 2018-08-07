import Mode from './mode.js';
import Util from './util.js';

//多行匹配 ie. /*....*/
var pairRules = [{
    pre: /\/\*/g,
    pre_exclude: [Util.excludeStrReg(/\/\*/), /\*\/\*/g, /\/\/[^\n]*/g],
    suffix: /\*\//g,
    suffix_exclude: [Util.excludeStrReg(/\*\//), /\/\/[^\n]*/g],
    token: 'pair_comment'
}]
//单行匹配
var rules = [{
    reg: /\bcontinue\b|\bdo\b|\belse\b|\bfor\b|\bif\b|\bnew\b|\breturn\b/g,
    token: 'key'
}, {
    reg: /\bclass\b/g,
    token: 'class'
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
    reg: /[.]?([\$_a-zA-Z][\$_a-zA-Z0-9]*?)(?=\()/g, //ie. test(),.test()
    token: 'function'
}, {
    reg: /function\s*?([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?(?=\()/g, //ie. function test()
    token: 'function_name'
}, {
    reg: /([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?:\s*?function\s*?(?=\()/g, //ie. fun:function()
    token: 'function_name'
}, {
    reg: /([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?(?==\s*?function\()/g, //ie. var test = function()
    token: 'function_name'
}, {
    reg: /function\s*?\(([\s\S]+?)\)|\bthis\b|\bself\b/g, //ie. function(arg1,arg2)
    token: 'function_arg',
    callback: Util.execArgsReg
}, {
    reg: /function\s*?[\$_a-zA-Z][\$_a-zA-Z0-9]*?\s*?\(([\s\S]+?)\)/g, //ie. function test(arg1,arg2)
    token: 'function_arg',
    callback: Util.execArgsReg
}, {
    reg: /'[^']*?'|"[^"]*?"/g,
    token: 'string'
}, {
    reg: /\/\/[^\n]*/g,
    exclude: Util.excludeStrReg(/\/\//),
    token: 'comment'
}]

Mode.rules = rules;
Mode.pairRules = pairRules;

export default Mode;