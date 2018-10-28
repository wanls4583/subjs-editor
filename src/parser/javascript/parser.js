import Parser from '../core/parser.js';
import Tokenizer from './tokenizer.js';

class JsParser extends Parser{
	constructor(editor){
		super(editor, Tokenizer);
	}
}

export default JsParser;