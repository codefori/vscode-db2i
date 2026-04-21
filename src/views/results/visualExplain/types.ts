export interface InitialState {
}

export interface WebviewRequestMessageBase {
  type: WebviewRequestTypes;
}

export enum WebviewRequestTypes {
  A = 'A'
}

export interface ARequest extends WebviewRequestMessageBase {
    type: WebviewRequestTypes.A;
    paramA: string;
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