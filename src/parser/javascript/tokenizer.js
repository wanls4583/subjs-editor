import Tokenizer from '../core/tokenizer.js';
import rules from './rules.js';

class JsTokenizer extends Tokenizer{
	constructor(editor){
		super(editor, rules);
	}
}

export default JsTokenizer;