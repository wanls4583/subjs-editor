! function() {
	var Util = {
		insertStr: function(str,index,cont){
			return str.substring(0,index) + cont + str.substr(index);
		}
	}

    function JsMode() {

    }

    JsMode.prototype.highlight = function(str) {
        var reg = [
            /^(?:[^'"]*?|(?:[^'"]*?(?:'\w*'|"\w*")[^'"]*?)*?)\/\*[\s\S]*?(?:[^'"]*?|(?:[^'"]*?(?:'\w*'|"\w*")[^'"]*?)*?)\*\//g, //多行注释
            /^[^'"]*\/\/[^\n]*/g, //单行注释
            /'[\s\S]*?'|"[\s\S]*?"/g, //字符串
            /\b(?:break|continue|do|else|for|if|return|while|var|function|new|class)\b/g, //关键字
            /\!==|\!=|==|=|\?|\&\&|\&|\|\||\||>=|>|<=|<|\+=|\+|\-=|\-|\*=|\*|\/=|\//g, //操作符
            /\d+|\b(?:undefined|null)(?:[\b;]|$)/g, //数字
            /[.]?([\w]+)(?=\()/g, //方法名
        ]

        var classNames = ['multi_comment','comment','string','key','oprator','number','method']

        var lineObj = {};
        var doneArr = []; //已处理过的区域

        for (var i = 1; i < reg.length; i++) {
            var match = null;
            var regObj = reg[i];
            while (match = regObj.exec(str)) {
                var start, end;
                if (!match[1]) {
                    start = match.index;
                    end = start + match[0].length - 1;
                } else {
                    start = match.index + match[0].indexOf(match[1]);
                    end = start + match[1].length - 1;
                }
                var className = classNames[i];
                var ifDo = true;
                for (var tmp = 0; tmp < doneArr.length; tmp++) {
                    if (start >= doneArr[tmp].start && start <= doneArr[tmp].end ||
                        end >= doneArr[tmp].start && end <= doneArr[tmp].end) {
                        ifDo = false;
                    }
                }
                if (!ifDo) {
                    continue;
                }

                doneArr.push({ start: start, end: end, className: className });
            }
            regObj.lastIndex = 0;
        }
        doneArr.sort(function(arg1, arg2) {
            if (arg1.start < arg2.start) {
                return -1
            } else if (arg1.start == arg2.start) {
                return 0;
            } else {
                return 1;
            }
        })
        for (var i = doneArr.length - 1; i >= 0; i--) {
            var obj = doneArr[i];
            str = Util.insertStr(str, obj.end + 1, '</span>');
            str = Util.insertStr(str, obj.start, '<span class="' + obj.className + '">');
        }
        if(str.substr(-2)=='*/'){

        }
        // console.log(str);
        return str;
    }
    window.JsMode = JsMode
}()