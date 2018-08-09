import Editor from '../editor/editor.js';
import JsMode from '../mode/javascript.js';
import css from '../css/theme/js-theme-monokai.css';

new Editor({
    $wrapper:'#editor',
    mode: JsMode
});