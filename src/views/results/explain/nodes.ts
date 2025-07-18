import Statement from "../../../database/statement";
import { ThemeColor } from "vscode";
import Configuration from "../../../configuration";
import { DoveNodeView } from "./doveNodeView";
import { Styles } from "../../cytoscape";

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
  /** Context objects include advised indexes and statistics */
  contextObjects: ContextObject[];
  /** Context to set when displaying this node, used to identify additional actions */
  nodeContext: string;
  styles: Styles
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

    this.topNode = this.processNode(this.nextNodeIndex);
  }

  /** Returns the top node */
  public get(): ExplainNode {
    return this.topNode;
  }

  private setNodeShape(node: ExplainNode, shape:string){
    node.styles["shape"] = shape
  }
  
  private processNode(index: number): ExplainNode {
    let state = new NodeProcessingState();
    let node = this.newNode(this.order[index]);
    this.setNodeShape(node, "roundrectangle");

    for (const data of this.flatNodes[node.id]) {
      // When a DELTA_ATTRIBUTES_INDICATOR row is encountered, the rows following it provide new values for previously processed attributes,
      // so we need to look back at currentNode.props to find the right entry to update with a new value.
      if (DELTA_ATTRIBUTES_INDICATOR === data.IFA_COLHDG) {
        state.processingDeltaAttributes = true;
        continue;
      }
      let displayable = true;
      // The value of the attribute may be spread across multiple data elements
      let value: any;
      switch (data.IFA_TYPOUT) {
        case ValueType.LONG_STRING:
          // Type indicates a long string so the value is continued in additional rows
          state.processingLongString = true;
          state.longString += data.IFA_CHROUT;
          continue;
        case ValueType.DOUBLE_BYTE_STRING:
          // Type indicates a long double-byte string so the value is continued in additional rows
          state.processingLongDoubleByteString = true;
          state.longDoubleByteString += data.IFA_DBLBYT;
          continue;
        case ValueType.DOUBLE_BYTE_STRING_END:
          state.processingLongDoubleByteString = false;
          value = state.longDoubleByteString + data.IFA_DBLBYT;
          state.longDoubleByteString = ``;
          break;
        case ValueType.NUMERIC:
          value = data.IFA_NUMOUT;
          break;
        case ValueType.INVISIBLE:
          // Invisible attributes are not meant for display, but are associated with context actions defined for the node
          displayable = false;
          break;
        case ValueType.CHARACTER:
        default:
          // If we were processing a long string, we've reached the end of the data, so wrap it up, clear the long string mode
          if (state.processingLongString) {
            value = state.longString + data.IFA_CHROUT;
            state.longString = ``;
            state.processingLongString = false;
            break;
          } else if (state.processingLongDoubleByteString) {
            value = state.longDoubleByteString + data.IFA_DBLBYT;
            state.longString = ``;
            break;
          }
          value = data.IFA_CHROUT;
          break;
      }
      if (displayable) {
        // Update the node details
        this.updateNode(node, value, state, data);
        // Update the highlight settings for this node, bitwise excluding 16 ( binary 10000 ) which corresponds to Highlighting.ATTRIBUTE_SECTION_HEADING ( bit index 4, zero-based ), since it doesn't apply to the main VE tree
        node.highlights.update(data.IFA_FMTVAL & ~16);
      }
      this.processContextData(node, data);
    }

    for (let subIndex = 0; subIndex < node.childrenNodes; subIndex++) {
      this.nextNodeIndex += 1;
      node.children.push(this.processNode(this.nextNodeIndex));
    }

    if (node.childrenNodes !== node.children.length) {
      throw new Error(`This makes no sense.`);
    }

    return node;
  }

  private isValidTitle(title:string):boolean{
    return /[a-zA-z]/.test(title)
  }
  
  /**
   * Update the node properties
   */
  private updateNode(node: ExplainNode, value: any, state: NodeProcessingState, data: any): void {
    const title = data.IFA_COLHDG;
    if (!this.isValidTitle(title)) {
      return;
    }
    const type = data.IFA_COLTYP;
    switch (type) {
      case RecordType.NEW_ICON:
        node.title = value;
        break;
      case RecordType.CHILD_COUNT:
        node.childrenNodes = value;
        break;
      case RecordType.CHILD_ICON:
        // TODO: what do we do with this?
        break;
      case RecordType.HEADING:
        node.props.push({
          type: type,
          title: title,
          value: ``
        });
        break;
      default:
        if (value || value === 0) {
          // If processing delta attributes, update the existing property entry, otherwise push a new one
          if (state.processingDeltaAttributes) {
            node.props.find(prop => prop.title === title).value = value;
          } else {
            const newProperty: ExplainProperty = {
              type: type,
              title: title,
              value: value
            };
            node.props.push(newProperty);
            if (data.IFA_FLYORD > 0) {
              node.tooltipProps.push(newProperty);
            }
          }
          // If this property is tagged as an object attribute, set the value
          switch (data.IFA_IFLAG) {
            case `1`: node.objectSchema = Statement.prettyName(value); break;
            case `2`: node.objectName = Statement.prettyName(value); break;
            default: break;
          }
        }
        break;
    }
  }

  /**
   * Creates a new ExplainNode
   */
  private newNode(nodeId: number): ExplainNode {
    return {
      id: nodeId,
      title: ``,
      objectSchema: ``,
      objectName: ``,
      childrenNodes: 0,
      children: [],
      props: [],
      tooltipProps: [],
      highlights: new NodeHighlights(),
      contextObjects: [],
      nodeContext: ``,
      styles: {}
    };
  }

  /**
   * Add context data to the node, most notably data pertaining to advised indexes and statistics.
   */
  private processContextData(node: ExplainNode, data: any) {
    let contextType: number = data.IFA_CTXTYP;
    // If the context data attribute relates to an advised index or statistic, squirrel it away
    if (contextType == ContextType.ADVISED_INDEX || contextType == ContextType.ADVISED_STATISTIC) {
      let attributeId: number = data.IFA_CTXORD;
      let contextObj: ContextObject;
      // The attributes are sequentially ordered, so for a given context type, we look to continue filling attributes of the last instance.
      // If the attribute we are adding is one that has already been set in the last context object, we start a new one.
      let co: ContextObject = node.contextObjects.filter((co) => co.contextType == contextType).pop();
      // If the attribute is not set, this is the context object that we will update
      if (co != undefined && !co.hasProperty(attributeId)) {
        contextObj = co;
      }
      // If we are not updating an existing context object, create one and push it onto the list
      if (!contextObj) {
        contextObj = new ContextObject(contextType);
        node.contextObjects.push(contextObj);
      }
      // Update the current context object
      contextObj.addProperty(attributeId, data);
    }
  }

  public getAllChildNodes(node: ExplainNode): ExplainNode[] {
    let nodes: ExplainNode[] = [];
    node.children.forEach(child => {
      nodes.push(child);
      this.getAllChildNodes(child).forEach(x => nodes.push(x));
    });
    return nodes;
  }

  /** Collects the context objects from the all the tree nodes, sorted by type */
  public getContextObjects(includeType?: number[]): ContextObject[] {
    let contextObjects: ContextObject[] = [];
    this.topNode.contextObjects.forEach(co => contextObjects.push(co));
    this.getAllChildNodes(this.topNode).forEach(en => en.contextObjects.forEach(co => contextObjects.push(co)));
    if (includeType) {
      contextObjects = contextObjects.filter(co => includeType.includes(co.contextType));
    }
    contextObjects.sort((a: ContextObject, b: ContextObject) => a.contextType - b.contextType);
    return contextObjects;
  }

  /**
   * Displays all advised indexes and statistics in the node view details pane
   */
  public showAdvisedIndexesAndStatistics(doveNodeView: DoveNodeView): void {
    // Filter the list to only advised indexes and statistics, and sort by type
    let contextObjects: ContextObject[] = this.getContextObjects([ContextType.ADVISED_INDEX, ContextType.ADVISED_STATISTIC]);
    // Build a dummy ExplainNode that can be handed to the node view for display
    let dummy: ExplainNode = this.newNode(0);
    dummy.contextObjects = contextObjects;
    dummy.title = "Advised Indexes and Statistics";
    if (contextObjects.length > 0) {
      // Spin the advised indexes and statistics, add their properties to the dummy node
      for (let co of contextObjects) {
        dummy.props.push({
          type: RecordType.HEADING,
          title: co.getDescription(),
          value: ""
        });
        co.properties.forEach(p => dummy.props.push(p));
      }
    } else {
      // No advice
      dummy.props.push({
        type: 0,
        title: "No advised indexes or statistics",
        value: ""
      });
    }
    // If there are advised indexes, set the context that enables the generate SQL action to create the indexes
    if (contextObjects.filter(co => co.contextType == ContextType.ADVISED_INDEX).length > 0) {
      dummy.nodeContext = `vscode-db2i:viewingAdvisedIndexes`;
    }
    // Display the dummy node
    doveNodeView.setNode(dummy, dummy.title);
  }
}

const DELTA_ATTRIBUTES_INDICATOR = `BEGIN DELTA ATTRIBUTES`;

/**
 * Record type indicators from the type column ( IFA_COLTYP )
 * @see https://www.ibm.com/docs/en/i/7.5?topic=ssw_ibm_i_75/apis/qqqvexpl.html#record_types
 */
export const RecordType = {
  NEW_ICON    :  10,
  CHILD_COUNT :  11,
  CHILD_ICON  :  12,
  HEADING     : 111
} as const

/**
 * Value type indicators from the data type column ( IFA_TYPOUT )
 */
const ValueType = {
  CHARACTER              : `C`,
  NUMERIC                : `N`,
  LONG_STRING            : `X`,
  DOUBLE_BYTE_STRING     : `Y`,
  DOUBLE_BYTE_STRING_END : `D`,
  INVISIBLE              : `I`
} as const

/**
 * Context type indicators from the context type column ( IFA_CTXTYP )
 * These are associated with invisible data, indicating actions the user might perform on the node
 */
export const ContextType = {
  TABLE_ACTIONS     : 21,
  INDEX_ACTIONS     : 22,
  ADVISED_INDEX     : 23,
  ENVIRONMENT       : 24,
  ADVISED_STATISTIC : 25,
  UDTF_ACTIONS      : 26
} as const

/**
 * ContextObjectProperty factory method
 * @param propertyId
 * @param data
 */
function newContextObjectProperty(propertyId: number, data: any): ContextObjectProperty {
  switch (data.IFA_CTXTYP) {
    case ContextType.ADVISED_INDEX: return new AdvisedIndexProperty(propertyId, data);
    case ContextType.ADVISED_STATISTIC: return new AdvisedStatisticProperty(propertyId, data);
    default: return new ContextObjectProperty(propertyId, data);
  }
}
/**
 * General context object property
 * Context data indicator from the context ordinal column ( IFA_CTXORD )
 * 
 *   1. SCHEMA
 *   2. NAME
 */
class ContextObjectProperty implements ExplainProperty {
  type: number;
  title: string;
  value: string|number;
  constructor(type: number, data: any) {
    this.type = type;
    this.setDescription(type);
    this.value = data.IFA_CHROUT;
  }
  protected setDescription(type: number): void {
    switch (type) {
      case 1: this.title = "Table schema"; break;
      case 2: this.title = "Table name"; break;
      default: this.title = ""; break;
    }
  }
}
/**
 * Advised index property
 * Context data indicator from the context ordinal column ( IFA_CTXORD )
 * 
 *   3. INDEX_TYPE
 *   4. INDEX_DISTINCT_VALUES
 *   5. INDEX_COLUMNS
 *   6. INDEX_SORT_SEQUENCE_SCHEMA
 *   7. INDEX_SORT_SEQUENCE_TABLE
 * 
 * @see {@link ContextObjectProperty}
 */
class AdvisedIndexProperty extends ContextObjectProperty {
  protected setDescription(type: number): void {
    switch (type) {
      case 3: this.title = "Index type"; break;
      case 4: this.title = "Distinct values"; break;
      case 5: this.title = "Key columns"; break;
      case 6: this.title = "Sort sequence table schema"; break;
      case 7: this.title = "Sort sequence table name"; break;
      default: super.setDescription(type); break;
    }
  }
}
/**
 * Advised statistic property
 * Context data indicator from the context ordinal column ( IFA_CTXORD )
 * 
 *   3. STATISTIC_COLUMN
 *   4. STATISTIC_REASON_ADVISED
 *   5. STATISTIC_IMPORTANCE
 *   6. STATISTIC_ID
 *   7. STATISTIC_SORT_SEQUENCE_SCHEMA
 *   8. STATISTIC_SORT_SEQUENCE_TABLE
 * 
 * @see {@link ContextObjectProperty}
 */
class AdvisedStatisticProperty extends ContextObjectProperty {
  constructor(type: number, data: any) {
    super(type, data);
    switch (type) {
      case 4:
        switch (data.IFA_CHROUT) {
          case `N`: this.value = "No statistic information"; break;
          case `S`: this.value = "Stale statistic"; break;
          default: this.value = "Unknown"; break;
        }
        break;
      // Advised statistic ID is a byte array, so use the value from that column instead
      case 6: this.value = data.IFA_HEXOUT; break;
      default: this.value = data.IFA_CHROUT; break;
    }
  }
  protected setDescription(type: number): void {
    switch (type) {
      case 3: this.title = "Table column"; break;
      case 4: this.title = "Reason advised"; break;
      case 5: this.title = "Importance"; break;
      case 6: this.title = "Statistic ID"; break;
      case 7: this.title = "Sort sequence table schema"; break;
      case 8: this.title = "Sort sequence table name"; break;
      default: super.setDescription(type); break;
    }
  }
}
export class ContextObject {
  contextType: number;
  properties: ContextObjectProperty[] = [];
  constructor(type: number) {
    this.contextType = type;
  }
  getDescription(): string {
    switch (this.contextType) {
      case ContextType.ADVISED_INDEX: return "Advised index";
      case ContextType.ADVISED_STATISTIC: return "Advised statistic";
      // The rest of the context object types are the environment and object actions, which we do not handle
      default: return "";
    }
  }
  /**
   * @param propertyId the context object property ordinal value, used as the index in the properties array
   * @param description the description of the context object property
   * @param value the context object property value
   */
  addProperty(propertyId: number, data: any): void {
    this.properties[propertyId] = newContextObjectProperty(propertyId, data);
  }
  hasProperty(propertyId: number): boolean {
    return this.properties[propertyId] != undefined;
  }
  
  /**
   * Log to console for debug
   */
  dump(): void {
    console.log(this.getDescription());
    for (let x in this.properties) {
      let property: ContextObjectProperty = this.properties[x];
      if (property != undefined) {
        console.log(`  ${property.title} = ${property.value}`);
      }
    }
  }
}

/**
 * Encapsulation of flags and accumulators used during processing of node data
 */
class NodeProcessingState {
  /** The IFA_CHROUT column is VARCHAR(128) and the IFA_DBLBYT column is VARGRAPHIC(64).  When longer data needs to be returned in those columns,
   *  the IFA_TYPOUT field will contain values 'X' and 'Y' respectively, indicating that the value continues in subsequent result rows.  Row
   *  continuation is terminated in the 'X' case when any other value is found.  Double-byte string continuation, represented by 'Y' is terminated
   *  when a 'D' is found.
   */
  longString = ``;
  longDoubleByteString = ``;
  processingLongString = false;
  processingLongDoubleByteString = false;
  /** Delta attributes were originally designed for a refresh in Explain While Running, but SQE has decided to return these on the initial paint. */
  processingDeltaAttributes = false;
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

  /**
   * Log to console for debug
   */
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