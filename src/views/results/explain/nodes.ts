export interface ExplainNode {
  id: number;
  title: string;
  objectSchema: string;
  objectName: string;
  childrenNodes: number;
  children: ExplainNode[];
  props: ExplainProperty[];
  tooltipProps: ExplainProperty[];
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
      
      if (!this.flatNodes[nodeId]) {
        this.flatNodes[nodeId] = [];
      }
    
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
      objectSchema: ``,
      objectName: ``,
      childrenNodes: 0,
      children: [],
      props: [],
      tooltipProps: []
    };

    // The IFA_CHROUT column is VARCHAR(128) and the IFA_DBLBYT column is VARGRAPHIC(64).  When longer data needs to be returned in those columns,
    // the IFA_TYPOUT field will contain values 'X' and 'Y' respectively, indicating that the value continues in subsequent result rows.  Row
    // continuation is terminated in the 'X' case when any other value is found.  Double-byte string continuation, represented by 'Y' is terminated
    // when a 'D' is found.
    let longString = ``;
    let longDoubleByteString = ``;
    let processingLongString = false;
    let processingLongDoubleByteString = false;
    // Delta attributes were originally designed for a refresh in Explain While Running, but SQE has decided to return these on the initial paint.
    let processingDeltaAttributesForNode = false;

    for (const data of nodeData) {
      // TODO: list of column types
      const nodeTitle = data.IFA_COLHDG;
      // Ignore rows with no title
      if (!nodeTitle) {
        continue;
      }

      // When a DELTA_ATTRIBUTES_INDICATOR row is encountered, the rows following it provide new values for previously processed attributes,
      // so we need to look back at currentNode.props to find the right entry to update with a new value.
      if (DELTA_ATTRIBUTES_INDICATOR === nodeTitle) {
        processingDeltaAttributesForNode = true;
        continue;
      }

      let nodeValue: any;
      switch (data.IFA_TYPOUT) {
        case ValueType.LONG_STRING:
          // Type indicates a long string so the value is continued in additional rows
          processingLongString = true;
          longString += data.IFA_CHROUT;
          continue;
        case ValueType.DOUBLE_BYTE_STRING:
          // Type indicates a long double-byte string so the value is continued in additional rows
          processingLongDoubleByteString = true;
          longDoubleByteString += data.IFA_DBLBYT;
          continue;
        case ValueType.DOUBLE_BYTE_STRING_END:
          processingLongDoubleByteString = false;
          nodeValue = longDoubleByteString + data.IFA_DBLBYT;
          longDoubleByteString = ``;
          break;
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
          } else if (processingLongDoubleByteString) {
            nodeValue = longDoubleByteString + data.IFA_DBLBYT;
            longString = ``;
            break;
          }
          nodeValue = data.IFA_CHROUT;
          break;
      }

      const nodeDataType = data.IFA_COLTYP;
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
            // If processing delta attributes, update the existing property entry, otherwise push a new one
            if (processingDeltaAttributesForNode) {
              currentNode.props.find(prop => prop.title === nodeTitle).value = nodeValue;
            } else {
              const newProperty: ExplainProperty = {
                type: nodeDataType,
                title: nodeTitle,
                value: nodeValue
              };
              currentNode.props.push(newProperty);
              if (data.IFA_FLYORD > 0) {
                currentNode.tooltipProps.push(newProperty);
              }
            }
            // If this property is tagged as an object attribute, set the value
            switch (data.IFA_IFLAG) {
              case `1`: currentNode.objectSchema = nodeValue; break;
              case `2`: currentNode.objectName = nodeValue; break;
              default: break;
            }
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
