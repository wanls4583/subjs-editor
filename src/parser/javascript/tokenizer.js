import Tokenizer from '../core/tokenizer.js';
import rules from './rules.js';

class JsTokenizer extends Tokenizer{
	constructor(editor, onTaskDone){
		super(editor, rules, onTaskDone);
	}
}

export default JsTokenizer;