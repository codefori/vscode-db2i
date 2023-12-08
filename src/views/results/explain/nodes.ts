import Statement from "../../../database/statement";
import { ThemeColor } from "vscode";
import Configuration from "../../../configuration";

export interface ExplainNode {
  id: number;
  title: string;
  objectSchema: string;
  objectName: string;
  childrenNodes: number;
  children: ExplainNode[];
  props: ExplainProperty[];
  tooltipProps: ExplainProperty[];
  highlights: NodeHighlights;
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
      tooltipProps: [],
      highlights: new NodeHighlights()
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
              case `1`: currentNode.objectSchema = Statement.prettyName(nodeValue); break;
              case `2`: currentNode.objectName = Statement.prettyName(nodeValue); break;
              default: break;
            }
          }
      }
      // Update the highlight settings for this node, bitwise excluding 16 ( binary 10000 ) which corresponds to Highlighting.ATTRIBUTE_SECTION_HEADING ( bit index 4, zero-based ), since it doesn't apply to the main VE tree
      currentNode.highlights.update(data.IFA_FMTVAL & ~16);
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
  
  private dumpNode(node: ExplainNode) {
    console.log(node.title);
    node.highlights.dump();
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
 * Value type indicators from the data type column ( IFA_TYPOUT )
 */
export enum ValueType {
  CHARACTER              = `C`,
  NUMERIC                = `N`,
  LONG_STRING            = `X`,
  DOUBLE_BYTE_STRING     = `Y`,
  DOUBLE_BYTE_STRING_END = `D`,
  INVISIBLE              = `I`
}

/**
 * Bit indexes for the format value column ( IFA_FMTVAL )
 */
export enum Highlighting {
  ESTIMATED_ROW_EXPENSIVE        = 1,
  ESTIMATED_TIME_EXPENSIVE       = 2,
  INDEX_ADVISED                  = 3,
  ATTRIBUTE_SECTION_HEADING      = 4,
  LOOKAHEAD_PREDICATE_GENERATION = 5,
  MATERIALIZED_QUERY_TABLE       = 6,
  ACTUAL_ROWS_EXPENSIVE          = 7,
  ACTUAL_TIME_EXPENSIVE          = 8,
}

export namespace Highlighting {
  export function getFromSettings(): NodeHighlights {
    let highlights = new NodeHighlights();
    // Defined in the configuration section of package.json, managed under Db2 for IBM i->Visual Explain in VS Code Settings
    let settings = Configuration.get(`visualExplain.highlighting`);
    if (settings) {
      let keys = Object.keys(settings);
      for (let key of keys) {
        if (settings[key]) {
          switch (key) {
            case "Index Advised": highlights.set(Highlighting.INDEX_ADVISED); break;
            case "Actual Number of Rows": highlights.set(Highlighting.ACTUAL_ROWS_EXPENSIVE); break;
            case "Actual Processing Time": highlights.set(Highlighting.ACTUAL_TIME_EXPENSIVE); break;
            case "Estimated Number of Rows": highlights.set(Highlighting.ESTIMATED_ROW_EXPENSIVE); break;
            case "Estimated Processing Time": highlights.set(Highlighting.ESTIMATED_TIME_EXPENSIVE); break;
            case "Lookahead Predicate Generation (LPG)": highlights.set(Highlighting.LOOKAHEAD_PREDICATE_GENERATION); break;
            case "Materialized Query Table (MQT)": highlights.set(Highlighting.MATERIALIZED_QUERY_TABLE); break;
            default: break;
          }
        }
      }
    } else {
      highlights.setAll();
    }
    return highlights;
  }

  /**
   * Returns the Highlighting entries in order of precedence
   */
  export function priorityOrder(): Highlighting[] {
    return [
      Highlighting.INDEX_ADVISED,
      Highlighting.ACTUAL_ROWS_EXPENSIVE,
      Highlighting.ACTUAL_TIME_EXPENSIVE,
      Highlighting.ESTIMATED_ROW_EXPENSIVE,
      Highlighting.ESTIMATED_TIME_EXPENSIVE,
      Highlighting.LOOKAHEAD_PREDICATE_GENERATION,
      Highlighting.MATERIALIZED_QUERY_TABLE,
      Highlighting.ATTRIBUTE_SECTION_HEADING
    ];
  }

  export const Descriptions: { [element in Highlighting]: string } = {
    1: /* ESTIMATED_ROW_EXPENSIVE        */ "Estimated Number of Rows",
    2: /* ESTIMATED_TIME_EXPENSIVE       */ "Estimated Processing Time",
    3: /* INDEX_ADVISED                  */ "Index Advised",
    4: /* ATTRIBUTE_SECTION_HEADING      */ "Attribute Section Heading",
    5: /* LOOKAHEAD_PREDICATE_GENERATION */ "Lookahead Predicate Generation (LPG)",
    6: /* MATERIALIZED_QUERY_TABLE       */ "Materialized Query Table (MQT)",
    7: /* ACTUAL_ROWS_EXPENSIVE          */ "Actual Number of Rows",
    8: /* ACTUAL_TIME_EXPENSIVE          */ "Actual Processing Time",
  }

  export const Colors: { [element in Highlighting]: ThemeColor } = {
    1: /* ESTIMATED_ROW_EXPENSIVE        */ new ThemeColor("db2i.dove.resultsView.HighlightEstimatedExpensiveRows"),
    2: /* ESTIMATED_TIME_EXPENSIVE       */ new ThemeColor("db2i.dove.resultsView.HighlightEstimatedExpensiveTime"),
    3: /* INDEX_ADVISED                  */ new ThemeColor("db2i.dove.resultsView.HighlightIndexAdvised"),
    4: /* ATTRIBUTE_SECTION_HEADING      */ new ThemeColor("db2i.dove.nodeView.AttributeSectionHeading"),
    5: /* LOOKAHEAD_PREDICATE_GENERATION */ new ThemeColor("db2i.dove.resultsView.HighlightLookaheadPredicateGeneration"),
    6: /* MATERIALIZED_QUERY_TABLE       */ new ThemeColor("db2i.dove.resultsView.HighlightMaterializedQueryTable"),
    7: /* ACTUAL_ROWS_EXPENSIVE          */ new ThemeColor("db2i.dove.resultsView.HighlightActualExpensiveRows"),
    8: /* ACTUAL_TIME_EXPENSIVE          */ new ThemeColor("db2i.dove.resultsView.HighlightActualExpensiveTime"),
  }
}

/**
 * Simple class for tracking node highlights
 * {@link Highlighting}
 */
export class NodeHighlights {
  /** The aggregate of format values from all the node attributes */
  formatValue: number = 0;

  constructor(value?: number) {
    this.formatValue = value || 0;
  }

  /**
   * Sets all the highlight bits
   */
  setAll(): this {
    Object.keys(Highlighting).filter(h => !isNaN(Number(h))).map(h => Number(h)).forEach(h => this.set(h));
    return this;
  }

  /**
   * Update the highlight bits
   */
  update(value: number): this {
    this.formatValue |= value;
    return this;
  }

  /**
   * Set the specified highlight bit
   */
  set(highlight: Highlighting): this {
    this.update(1 << highlight);
    return this;
  }

  /**
   * Returns whether or not the specified highlight bit is set
   */
  isSet(highlight: Highlighting): boolean {
    return ((this.formatValue >> highlight) % 2) == 1;
  }

  /**
   * Returns the count of highlight bits that are set
   */
  getCount(): number {
    return Object.keys(Highlighting).filter(h => isNaN(Number(h))).filter(h => this.isSet(Highlighting[h])).map(h => Highlighting[h]).length;
  }

  /**
   * Returns the names of the highlight bits that are set, in priority order
   */
  getNames(): string[] {
    let names: string[] = [];
    for (let highlight of Highlighting.priorityOrder()) {
      if (this.isSet(highlight)) {
        names.push(Highlighting[highlight]);
      }
    }
    return names;
  }

  /**
  * Returns the highest priority highlight color that matches the user's highlight preferences
  */
  getPriorityColor(): ThemeColor {
    // From the user's highlight preferences, find the highest priority highlight set for this node
    for (let name of Highlighting.getFromSettings().getNames()) {
      const highlight: Highlighting = Highlighting[name];
      if (this.isSet(highlight)) {
        return Highlighting.Colors[highlight];
      }
    }
    return null;
  }

  dump(): void {
    if (this.formatValue > 0) {
      console.log([
        "  " + this.constructor['name'] + ": " + this.formatValue,
        ...Object.keys(Highlighting).filter(h => isNaN(Number(h)) && this.isSet(Highlighting[h])).map(h => "    - " + h)
      ].join("\n")
      );
    }
  }
}