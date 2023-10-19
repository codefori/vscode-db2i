export interface ExplainNode {
  id: number;
  title: string;
  childrenNodes: number;
  children: ExplainNode[],
  props: ExplainProperty[]
}

export interface ExplainProperty {
  type: number;
  title: string;
  value: string|number;
}

export class ExplainTree {
  private flatNodes: {[nodeId: number]: any[]} = {};
  private order: number[] = [];
  private nextNodeIndex = 0;

  private topNode: ExplainNode|undefined;

  constructor(veData) {
    for (let node of veData) {
      const nodeId = node.IFA_ICON;
    
      if (!this.order.includes(nodeId)) {
        this.order.push(nodeId)
      }
      
      if (!this.flatNodes[nodeId]) this.flatNodes[nodeId] = [];
    
      this.flatNodes[nodeId].push(node);
    }

    this.topNode = this.handleNode(this.nextNodeIndex);
  }

  public get() {
    return this.topNode;
  }

  private handleNode(index: number) {
    const nodeId = this.order[index];
    /** @type {any[]} */
    const nodeData = this.flatNodes[nodeId];
  
    let currentNode: ExplainNode = {
      id: nodeId,
      title: ``,
      childrenNodes: 0,
      children: [],
      props: []
    };
  
    for (const data of nodeData) {
      const nodeType = data.IFA_COLTYP;
      const nodeTitle = data.IFA_COLHDG;
      const nodeValue = data.IFA_TYPOUT === `N` ? data.IFA_NUMOUT : data.IFA_CHROUT;
  
      switch (nodeType) {
      case 10:
        currentNode.title = nodeValue;
        break;
      case 11:
        currentNode.childrenNodes = nodeValue;
        break;
      default:
        if (nodeValue || nodeValue === 0) {
          currentNode.props.push({
            type: nodeType,
            title: nodeTitle,
            value: nodeValue
          });
        }
      }
    }
  
    for (let subIndex = 0; subIndex < currentNode.childrenNodes; subIndex++) {
      this.nextNodeIndex += 1;
      currentNode.children.push(this.handleNode(this.nextNodeIndex));
    }
  
    if (currentNode.childrenNodes !== currentNode.children.length) {
      throw new Error(`This makes no sense.`);
    }
  
    return currentNode;
  }
}