class Parser{
	/**
	 * @param  {Editor}    editor    编辑器
	 * @param  {Function}  Tokenizer 词法分析器
	 * @param  {Array}     rules 	 词法规则
	 */
	constructor(editor, Tokenizer){
		var self = this;
		this.editor = editor;
		this.tokenizer = new Tokenizer(editor, function(firstLine){
			self.parse(firstLine);
		});
	}
	/**
	 * 语法分析
	 * @param  {Number} firstLine 开始分析的首行
	 */
	parse(firstLine){

	}
}

export default Parser;