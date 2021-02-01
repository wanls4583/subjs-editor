/*
 * @Author: lisong
 * @Date: 2020-10-31 13:48:50
 * @Description: 工具类
 */
import $ from 'jquery';

class Util {
    //获取数字
    static getNum(value) {
        value = String(value);
        value = value.replace(/[^0123456789\.]/g, '');
        var reg = /^\d+(\.\d*)?$/;
        var r = reg.exec(value);
        var num = r && r[0] || '';
        if (num) {
            num = Number(r[0]);
        }
        return num;
    }
    //获取选中的文本
    static getSelectedText() {
        if (document.selection) {
            return document.selection.createRange().text;
        } else if (window.getSelection) {
            return window.getSelection().toString();
        }
    }
    /**
     * 获取样式属性计算值
     * @param  {DOM} dom
     * @param  {string} prop 样式属性
     * @return {string}      属性值
     */
    static getStyleVal(dom, prop) {
        var styles = null;
        if (window.getComputedStyle) {
            styles = window.getComputedStyle(dom, null);
        } else {
            styles = dom.currentStyle
        }
        if (prop) {
            return styles[prop];
        }
        return styles;
    }
    //请求下一帧
    static nextFrame(callback) {
        if (window.requestAnimationFrame) {
            return window.requestAnimationFrame(callback);
        } else {
            return setTimeout(function () {
                callback();
            }, 0);
        }
    }
    //取消下一帧
    static cancelNextFrame(id) {
        if (window.requestAnimationFrame) {
            window.cancelAnimationFrame(id);
        } else {
            clearTimeout(id);
        }
    }
    //获取margin,padding,offset(相对页面边缘)
    static getRect(dom) {
        var _r = dom.getBoundingClientRect();
        var styles = null;
        if (window.getComputedStyle) {
            styles = window.getComputedStyle(dom, null);
        } else {
            styles = dom.currentStyle;
        }
        var _pt = styles['paddingTop'];
        _pt = this.getNum(_pt);
        var _pb = styles['paddingBottom'];
        _pb = this.getNum(_pb);
        var _pl = styles['paddingLeft'];
        _pl = this.getNum(_pl);
        var _pr = styles['paddingRight'];
        _pr = this.getNum(_pr);
        var _mt = styles['marginTop'];
        _mt = this.getNum(_mt);
        var _mb = styles['marginBottom'];
        _mb = this.getNum(_mb);
        var _ml = styles['marginLeft'];
        _ml = this.getNum(_ml);
        var _mr = styles['marginRight'];
        _mr = this.getNum(_mr);
        return {
            top: _r.top,
            bottom: _r.bottom,
            left: _r.left,
            right: _r.right,
            paddingTop: _pt,
            paddingBottom: _pb,
            paddingLeft: _pl,
            paddingRight: _pr,
            marginTop: _mt,
            marginBottom: _mb,
            marginLeft: _ml,
            marginRight: _mr,
            offsetTop: dom.offsetTop,
            offsetBottom: dom.offsetBottom,
            offsetLeft: dom.offsetLeft,
            offsetRight: dom.offsetRight,
        }
    }
    /**
     * 获取文本在浏览器中的真实宽度
     * @param  {string} str       文本
     * @param  {number} charW     半角符号/文字宽度
     * @param  {number} fullCharW 全角符号/文字宽度
     * @param  {number} start     文本开始索引
     * @param  {number} end       文本结束索引
     * @return {number}           文本真实宽度
     */
    static getStrWidth(str, charW, fullCharW, start, end) {
        if (typeof start != 'undefined') {
            str = str.substr(start);
        }
        if (typeof end != 'undefined') {
            str = str.substring(0, end - start);
        }
        var match = str.match(this.fullAngleReg);
        var width = str.length * charW;
        if (match) {
            width = match.length * fullCharW + (str.length - match.length) * charW;
        }
        return width;
    }
    /**
     * 获取文本在浏览器中的真实宽度
     * @param  {string} str       文本
     * @param  {DOM} wrap     容器
     */
    static getStrExactWidth(str, wrap) {
        Util.getStrExactWidth.count = Util.getStrExactWidth.count || 0;
        Util.getStrExactWidth.count++;
        if (!str) {
            return 0;
        }
        str = Util.htmlTrans(str);
        var id = 'str-width-' + Util.getUUID();
        var $tempDom = $(`<span style="display:inline-block;white-space:pre;" class="subjs-temp-text" id="${id}">${str}</span>`);
        $(wrap).append($tempDom)
        var dom = $('#' + id)[0];
        var charWidth = dom.clientWidth;
        if (Util.getStrExactWidth.count > 500) { //避免频繁删除dom导致浏览器卡顿
            $('.subjs-temp-text').remove();
        } else {
            clearTimeout(Util.getStrExactWidth.timer);
            Util.getStrExactWidth.timer = setTimeout(() => {
                $('.subjs-temp-text').remove();
            }, 500);
        }
        return charWidth;
    }
    //生成指定个数的空白符
    static space(tabsize) {
        var val = '';
        for (var tmp = 0; tmp < tabsize; tmp++) {
            val += ' '
        };
        return val;
    }
    //数组数字排序
    static sortNum(arr) {
        arr.sort(function (arg1, arg2) {
            return Number(arg1) - Number(arg2);
        })
    }
    //获取滚动条宽度
    static getScrBarWidth() {
        if (!this.scrBarWidth) {
            var wrap = $('<div style="height:30px;width:30px;overflow:auto"><div style="height:100px"></div></div>')
            document.body.append(wrap[0]);
            var w = wrap[0].offsetWidth - wrap[0].clientWidth;;
            wrap.remove();
            this.scrBarWidth = w;
            return w;
        }
        return this.scrBarWidth;
    }
    //获取字符宽度
    static getCharWidth(wrap) {
        var str1 = '------------------------------------------------------------------------------------';
        var str2 = '一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一';
        var id1 = 'char-width-' + Util.getUUID();
        var id2 = 'char-width-' + Util.getUUID();
        var $tempDom = $(`<span style="display:inline-block" id="${id1}">${str1}</span><span style="display:inline-block" id="${id2}">${str2}</span>`);
        $(wrap).append($tempDom)
        var dom = $('#' + id1)[0];
        var charWidth = dom.clientWidth / str1.length;
        var charHight = dom.clientHeight;
        var fullAngleCharWidth = $('#' + id2)[0].clientWidth / str2.length;
        var fontSize = window.getComputedStyle ? window.getComputedStyle(dom, null).fontSize : dom.currentStyle.fontSize;
        $tempDom.remove();
        return {
            charWidth: charWidth,
            fullAngleCharWidth: fullAngleCharWidth,
            charHight: charHight,
            fontSize: fontSize
        }
    }
    //<,>转义
    static htmlTrans(cont) {
        return cont.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    /**
     * 在字符串指定位置插入新的内容
     * @param  {String} str   原字符串
     * @param  {Number} index 插入的位置
     * @param  {String} cont  插入的内容
     * @return {String}       处理后的内容
     */
    static insertStr(str, index, cont) {
        return str.substring(0, index) + cont + str.substr(index);
    }
    //克隆对象
    static copyObj(obj) {
        var result = {};
        if (obj && typeof obj == 'object') {
            if (obj instanceof Array) {
                result = [];
            }
            for (var key in obj) {
                result[key] = Util.copyObj(obj[key]);
            }
        } else {
            result = obj;
        }
        return result;
    }
    static getUUID(len) {
        len = len || 16;
        var str = '';
        for (var i = 0; i < len; i++) {
            str += (Math.random() * 16 | 0).toString(16);
        }
        return str;
    }
    /**
     * 比较坐标的前后
     * @param {Object} start 
     * @param {Object} end 
     */
    static comparePos(start, end) {
        if (start.line > end.line || start.line == end.line && start.column > end.column) {
            return 1;
        } else if (start.line == end.line && start.column == end.column) {
            return 0
        } else {
            return -1;
        }
    }
    /**
     * 比较node的先后
     * @param {Node} node1 
     * @param {Node} node2 
     */
    static compareNode(node1, node2) {
        if (node1.line > node2.line) {
            return 1;
        } else if (node1.line < node2.line) {
            return -1
        } else if (node1.start > node2.start) {
            return 1;
        } else if (node1.start < node2.start) {
            return -1
        }
        return 0;
    }
}
//全角符号和中文字符
Util.fullAngleReg = /[\x00-\x1f\x80-\xa0\xad\u1680\u180E\u2000-\u200f\u2028\u2029\u202F\u205F\u3000\uFEFF\uFFF9-\uFFFC]|[\u1100-\u115F\u11A3-\u11A7\u11FA-\u11FF\u2329-\u232A\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u303E\u3041-\u3096\u3099-\u30FF\u3105-\u312D\u3131-\u318E\u3190-\u31BA\u31C0-\u31E3\u31F0-\u321E\u3220-\u3247\u3250-\u32FE\u3300-\u4DBF\u4E00-\uA48C\uA490-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
Util.keyCode = {
    'delete': 46,
    'backspace': 8
}
Util.constData = {
    PAIR_START: -1,
    PAIR_START_END: 0,
    PAIR_END: 1,
    FOLD_OPEN: 1,
    FOLD_CLOSE: -1,
    OP_ADD: 1,
    OP_DEL: -1,
    OP_REPLACE: 0,
    SENIOR_LEVEL: 999999
}
export default Util;