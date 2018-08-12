import $ from 'jquery';

/////////
// 工具类 //
/////////
class Util {
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
        if (window.getComputedStyle) {
            return window.getComputedStyle(dom, null)[prop];
        } else {
            return dom.currentStyle[prop]
        }
    }
    //px属性值转为整数
    static pxToNum(px) {
        return parseInt(px.substring(0, px.length - 2))
    }
    //请求下一帧
    static nextFrame(callback) {
        if (window.requestAnimationFrame) {
            return window.requestAnimationFrame(callback);
        } else {
            return setTimeout(function() {
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
        var _pt = this.getStyleVal(dom, 'paddingTop');
        _pt = this.pxToNum(_pt);
        var _pb = Util.getStyleVal(dom, 'paddingBottom');
        _pb = this.pxToNum(_pb);
        var _pl = this.getStyleVal(dom, 'paddingLeft');
        _pl = this.pxToNum(_pl);
        var _pr = this.getStyleVal(dom, 'paddingRight');
        _pr = this.pxToNum(_pr);
        var _mt = this.getStyleVal(dom, 'marginTop');
        _mt = this.pxToNum(_mt);
        var _mb = Util.getStyleVal(dom, 'marginBottom');
        _mb = this.pxToNum(_mb);
        var _ml = this.getStyleVal(dom, 'marginLeft');
        _ml = this.pxToNum(_ml);
        var _mr = this.getStyleVal(dom, 'marginRight');
        _mr = this.pxToNum(_mr);
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
            width += match.length * (fullCharW - charW);
        }
        return width;
    }
    //生成指定个数的空白符
    static space(tabsize) {
        var val = '';
        for (var tmp = 0; tmp < tabsize; tmp++) { val += ' ' };
        return val;
    }
    //数组数字排序
    static sortNum(arr) {
        arr.sort(function(arg1, arg2) {
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
        var str1 = '--------------';
        var str2 = '一一一一一一一一';
        wrap.innerHTML = `<span style="display:inline-block" class="char_width_1">${str1}</span><span style="display:inline-block" class="char_width_2">${str2}</span>`;
        var dom = $('.char_width_1')[0];
        var charWidth = dom.clientWidth / str1.length;
        var charHight = dom.clientHeight;
        var fullAngleCharWidth = $('.char_width_2')[0].clientWidth / str2.length;
        var fontSize = window.getComputedStyle ? window.getComputedStyle(dom, null).fontSize : dom.currentStyle.fontSize;
        wrap.innerHTML = '';
        return{
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
}
//全角符号和中文字符
Util.fullAngleReg = /[\x00-\x1f\x80-\xa0\xad\u1680\u180E\u2000-\u200f\u2028\u2029\u202F\u205F\u3000\uFEFF\uFFF9-\uFFFC]|[\u1100-\u115F\u11A3-\u11A7\u11FA-\u11FF\u2329-\u232A\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u303E\u3041-\u3096\u3099-\u30FF\u3105-\u312D\u3131-\u318E\u3190-\u31BA\u31C0-\u31E3\u31F0-\u321E\u3220-\u3247\u3250-\u32FE\u3300-\u4DBF\u4E00-\uA48C\uA490-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;

export default Util;