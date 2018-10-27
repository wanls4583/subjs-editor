import Editor from '../editor/editor.js';
import JsMode from '../highlight/javascript/highlight.js';
import css from '../css/theme/javascript/js-theme-monokai.css';

window.subjs = new Editor({
    $wrapper:'#editor',
    highlighter: JsMode
});