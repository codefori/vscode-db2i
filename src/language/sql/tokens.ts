import { Token } from './types';

interface Matcher {
  name: string;
  match: {
    type: string;
    match?: Function;
  }[];
  becomes: string;
};

export const NameTypes = [`word`, `sqlName`, `function`];

export default class SQLTokeniser {
  matchers: Matcher[] = [
    {
      name: `CLAUSE`,
      match: [{ type: `word`, match: (value: string) => {
        return [`WHERE`, `HAVING`, `GROUP`, `LIMIT`, `OFFSET`, `ORDER`].includes(value.toUpperCase());
      } }],
      becomes: `clause`,
    },
    {
      name: `JOIN`,
      match: [
        { type: `word`, match: (value: string) => {
          return [`INNER`, `EXCEPTION`, `CROSS`].includes(value.toUpperCase());
        } }, 
        {type: `word`, match: (value: string) => {return value.toUpperCase() === `JOIN`}}
      ],
      becomes: `join`,
    },
    {
      name: `JOIN`,
      match: [
        {type: `word`, match: (value: string) => {return [`FULL`, `LEFT`, `RIGHT`].includes(value.toUpperCase())}},
        {type: `word`, match: (value: string) => {return value.toUpperCase() === `OUTER`}},
        {type: `word`, match: (value: string) => {return value.toUpperCase() === `JOIN`}}
      ],
      becomes: `join`,
    },
    {
      name: `KEYWORD`,
      match: [{ type: `word`, match: (value: string) => {
        return [`AS`, `OR`, `REPLACE`].includes(value.toUpperCase());
      } }],
      becomes: `keyword`,
    },
    {
      name: `SQLNAME`,
      match: [{ type: `doublequote` }, { type: `word` }, { type: `doublequote` }],
      becomes: `sqlName`,
    },
    {
      name: `CONCAT`,
      match: [{ type: `pipe` }, { type: `pipe` }],
      becomes: `concat`,
    },
    {
      name: `NEWLINE`,
      match: [{ type: `newliner` }, { type: `newline` }],
      becomes: `newline`,
    },
  ];
  readonly spaces = [` `];
  readonly splitParts: string[] = [`(`, `)`, `/`, `.`, `*`, `-`, `+`, `;`, `"`, `&`, `%`, `,`, `|`, `\n`, `\r`, ...this.spaces];
  readonly types: { [part: string]: string } = {
    '(': `openbracket`,
    ')': `closebracket`,
    '/': `forwardslash`,
    '.': `dot`,
    '*': `asterisk`,
    '-': `minus`,
    '+': `plus`,
    ';': `semicolon`,
    '&': `ampersand`,
    '"': `doublequote`,
    '%': `percent`,
    ',': `comma`,
    '|': `pipe`,
    '\n': `newline`,
    '\r': `newliner`,
  };
  readonly stringChar: string = `'`;

  readonly startCommentString: string = `--`;
  readonly endCommentString = `\n`;

  constructor() { }

  tokenise(content: string) {
    let commentStart = -1;
    let inComment = false;

    let inString = false;

    let result: Token[] = [];

    let startsAt = 0;
    let currentText = ``;

    for (let i = 0; i < content.length; i++) {
      // Handle when the comment character is found
      if (inString === false && inComment === false && content[i] && content[i + 1] && content.substring(i, i + 2) === this.startCommentString) {
        commentStart = i;
        inComment = true;

        // Handle when the end of line is there and we're in a comment
      } else if (inComment && content[i] === this.endCommentString) {
        const preNewLine = i - 1;
        content = content.substring(0, commentStart) + ` `.repeat(preNewLine - commentStart) + content.substring(preNewLine);
        i--; // So we process the newline next
        inComment = false;

        // Ignore characters when we're in a comment
      } else if (inComment) {
        continue;

        // Handle when we're in a string
      } else if (inString && content[i] !== this.stringChar) {
        currentText += content[i];

      } else {
        switch (content[i]) {
          // When it's the string character..
          case this.stringChar:
            if (inString) {
              currentText += content[i];
              result.push({ value: currentText, type: `string`, range: { start: startsAt, end: startsAt + currentText.length } });
              currentText = ``;
            } else {
              startsAt = i;
              currentText += content[i];
            }

            inString = !inString;
            break;

          // When it's any other character...
          default:
            if (this.splitParts.includes(content[i]) && inString === false) {
              if (currentText.trim() !== ``) {
                result.push({ value: currentText, type: `word`, range: { start: startsAt, end: startsAt + currentText.length } });
                currentText = ``;
              }

              if (!this.spaces.includes(content[i])) {
                result.push({ value: content[i], type: this.types[content[i]], range: { start: i, end: i + content[i].length } });
              }

              startsAt = i + 1;

            } else {
              currentText += content[i];
            }
            break;
        }
      }
    }

    if (currentText.trim() !== ``) {
      result.push({ value: currentText, type: `word`, range: { start: startsAt, end: startsAt + currentText.length } });
      currentText = ``;
    }

    result = this.fixStatement(result);
    // result = SQLTokeniser.createBlocks(result);
    // result = SQLTokeniser.findScalars(result);

    return result;
  }

  private fixStatement(tokens: Token[]) {
    for (let i = 0; i < tokens.length; i++) {
      for (let y = 0; y < this.matchers.length; y++) {
        const type = this.matchers[y];
        let goodMatch = true;

        for (let x = 0; x < type.match.length; x++) {
          const match = type.match[x];

          if (tokens[i + x]) {
            if (tokens[i + x].type === match.type) {
              if (match.match) {
                if (match.match(tokens[i + x].value)) {
                  goodMatch = true;
                } else {
                  goodMatch = false;
                  break;
                }
              } else {
                goodMatch = true;
              }
            } else {
              goodMatch = false;
              break;
            }
          } else {
            goodMatch = false;
          }
        }

        if (goodMatch) {
          const matchedTokens = tokens.slice(i, i + type.match.length);
          const value = matchedTokens.map(x => x.value).join(``);
          tokens.splice(i, type.match.length, {
            type: type.becomes,
            value,
            range: {
              start: matchedTokens[0].range.start,
              end: matchedTokens[matchedTokens.length - 1].range.end
            }
          });

          break;
        }
      }
    }

    return tokens;
  }

  static createBlocks(tokens: Token[]) {
    let start = 0;
    let level = 0;

    for (let i = 0; i < tokens.length; i++) {
      switch (tokens[i].type) {
        case `openbracket`:
          if (level === 0) {
            start = i;
          }
          level++;
          break;
        case `closebracket`:
          level--;

          if (level === 0) {
            tokens.splice(start, i - start + 1, {
              type: `block`,
              block: this.createBlocks(tokens.slice(start + 1, i)),
              range: {
                start: tokens[start].range.start,
                end: tokens[i].range.end
              }
            });
            i = start;
          }
          break;
      }
    }

    return tokens;
  }

  static findScalars(tokens: Token[]) {
    for (let i = 0; i < tokens.length; i++) {
      switch (tokens[i].type) {
        case `word`:
          if (tokens[i + 1] && tokens[i + 1].type === `openbracket`) {
            tokens[i].type = `function`
          }
          break;
      }
    }

    return tokens;
  }
}