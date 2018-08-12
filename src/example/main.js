import Editor from '../editor/editor.js';
import JsMode from '../highlight/javascript.js';
import css from '../css/theme/js-theme-monokai.css';

window.subjs = new Editor({
    $wrapper:'#editor',
    highlighter: JsMode
});