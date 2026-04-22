import { ExplainNode } from "../explain/nodes";

export interface HighlightColor {
  highlight: number;
  color: string;
}

export interface InitialState {
  topLevelNode?: ExplainNode | null;
}

export interface WebviewRequestMessageBase {
  type: WebviewRequestTypes;
}

export enum WebviewRequestTypes {
  NODE_SELECTED = 'NODE_SELECTED'
}

export interface NodeSelectedRequest extends WebviewRequestMessageBase {
    type: WebviewRequestTypes.NODE_SELECTED;
    nodeId: number;
}

export interface ExtensionRequestMessageBase {
  type: ExtensionRequestTypes;
}

export enum ExtensionRequestTypes {
  B = 'B'
}

export interface BRequest extends ExtensionRequestMessageBase {
    type: ExtensionRequestTypes.B;
    paramB: string;
}
