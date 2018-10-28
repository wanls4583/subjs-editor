import Editor from '../editor/editor.js';
import JsMode from '../highlight/javascript/highlight.js';
import css from '../css/theme/javascript/js-theme-monokai.css';
import JsParser from '../parser/javascript/parser.js'; 

window.subjs = new Editor({
    $wrapper:'#editor',
    highlighter: JsMode,
    parser: JsParser
});