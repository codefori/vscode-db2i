export interface SelfCodeObject {
  code: string;
  message: string;
}

export const selfCodesMap: SelfCodeObject[] = [
  {code: `*ALL`, message: undefined},
  {code: `*Error`, message: undefined},
  {code: `*WARN`, message:undefined},
  {code: `*NONE`, message:undefined}
];
