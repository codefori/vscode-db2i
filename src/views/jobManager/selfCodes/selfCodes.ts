export interface SelfCodeObject {
  code: string;
  message: string;
}

export const selfCodesMap: SelfCodeObject[] = [
  { code: "138", message: "Argument of substringing function not valid" },
  { code: "180", message: "Syntax of date, time, or timestamp not valid" },
  {
    code: "181",
    message: "Value in date, time, or timestamp string not valid",
  },
  { code: "182", message: "A date, time, or timestamp expression not valid" },
  { code: "183", message: "Result of date or timestamp expression not valid" },
  { code: "199", message: "Keyword not expected, valid tokens:" },
  { code: "203", message: "Name is ambiguous" },
  { code: "204", message: "&1 in &2 type *&3 not found." },
  { code: "205", message: "Column not in table" },
  { code: "206", message: "Column or global variable not found" },
  { code: "304", message: "Conversion error in assignment to variable" },
  { code: "420", message: "Value for cast argument not valid" },
  { code: "551", message: "Not authorized to object &1 in &2 type *&3." },
  { code: "802", message: "Data conversion or mapping error" },
  { code: "811", message: "Result of SELECT more than one row." },
];
