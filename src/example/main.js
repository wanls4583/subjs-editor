import Editor from '../editor/editor.js';
import JsMode from '../highlight/javascript.js';
import css from '../css/theme/js-theme-monokai.css';

new Editor({
    $wrapper:'#editor',
    mode: JsMode
});