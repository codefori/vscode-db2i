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

    // The IFA_CHROUT column is VARCHAR(128), which means data that needs to be returned that exceeds that length must flow over to additional records
    let longString = ``;
    let processingLongString = false;

    // TODO: add logic for processing records that follow a CHANGED_ATTRIBUTES_INDICATOR record
    //       once such a record is encountered, all following records provide new values for
    //       previously processed attributes, so we need to look back at currentNode.props to find
    //       the right entry to update with a new value.  Fun!

    for (const data of nodeData) {
      // TODO: list of column types

      let nodeValue: any;
      switch (data.IFA_TYPOUT) {
        case ValueType.LONG_STRING:
          // Type indicates a long string, meaning one or more following records continue the value
          processingLongString = true;
          longString += data.IFA_CHROUT;
          continue;
        case ValueType.NUMERIC:
          nodeValue = data.IFA_NUMOUT;
          break;
        case ValueType.INVISIBLE:
          // TODO: invisible attributes are not meant for display, but are associated with context actions defined for the node.
          //       Until we implement context action support, ignore these attributes.
          continue;
        case ValueType.CHARACTER:
        default:
          // If we were processing a long string, we've reached the end of the data, so wrap it up, clear the long string mode
          if (processingLongString) {
            nodeValue = longString + data.IFA_CHROUT;
            longString = ``;
            processingLongString = false;
            break;
          }
          nodeValue = data.IFA_CHROUT;
          break;
      }

      const nodeDataType = data.IFA_COLTYP;
      const nodeTitle = data.IFA_COLHDG;
      switch (nodeDataType) {
        case RecordType.NEW_ICON:
          currentNode.title = nodeValue;
          break;
        case RecordType.CHILD_COUNT:
          currentNode.childrenNodes = nodeValue;
          break;
        case RecordType.CHILD_ICON:
          // TODO: what do we do with this?
          break;
        case RecordType.HEADING:
          // If not the first node, add a blank node before the heading to space things out a bit
          if (currentNode.props.length > 0) {
            currentNode.props.push({
              type: 0,
              title: ``,
              value: ``
            });
          }
          currentNode.props.push({
            type: nodeDataType,
            title: nodeTitle,
            value: ``
          });
          break;
        default:
          if (nodeValue || nodeValue === 0) {
            currentNode.props.push({
              type: nodeDataType,
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

const DELTA_ATTRIBUTES_INDICATOR = `BEGIN DELTA ATTRIBUTES`;

/**
 * Record type indicators from the type column ( IFA_COLTYP )
 * @see https://www.ibm.com/docs/en/i/7.5?topic=ssw_ibm_i_75/apis/qqqvexpl.html#record_types
 */
export enum RecordType {
  NEW_ICON      =  10,
  CHILD_COUNT   =  11,
  CHILD_ICON    =  12,
  HEADING       = 111
}

/**
 * Value type indicators from the  data type column ( IFA_TYPOUT )
 */
export enum ValueType {
  CHARACTER              = `C`,
  NUMERIC                = `N`,
  LONG_STRING            = `X`,
  DOUBLE_BYTE_STRING     = `Y`,
  DOUBLE_BYTE_STRING_END = `D`,
  INVISIBLE              = `I`
}
