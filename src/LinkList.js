/**
 * 多行匹配节点
 */
class Node{
	constructor(line,start,end,token,type){
		this.line = line;
		this.start = start;
		this.end = end;
		this.token = token;
		this.type = type; //1.开始，2.结束
		this.next = null;
		this.prev = null;
		this.preMatch = null;
		this.suffixMatch = null;
	}
}
/**
 * 多行匹配链
 */
class LinkList{
	constructor(){
		//链表头
		this.head = new Node(0);
	}
	//插入一个节点
	insert(node){
		var head = this.head;
		while(head.line < node.line || head.start < node.start){
			if(head.next){
				head = head.next;
			}else{
				break;
			}
		}
		head.next = node;
		node.prev = head;
	}
	//删除节点
	del(startNode, endNode){
		if(startNode.prev){
			startNode.prev.next = endNode.next;
		}else{
			this.head = endNode.next;
		}
	}
}