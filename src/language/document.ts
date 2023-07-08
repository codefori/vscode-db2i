import Statement from "./statement";
import SQLTokeniser from "./tokens";
import { IRange, Token } from "./types";

export default class Document {
  statements: Statement[];
  constructor(content: string) {
    this.statements = [];

    const tokeniser = new SQLTokeniser();
    this.parseStatements(tokeniser.tokenise(content));
  }

  parseStatements(tokens: Token[]) {
    let statementStart = 0;

    for (let i = 0; i < tokens.length; i++) {
      switch (tokens[i].type) {
        case `semicolon`:
          const statementTokens = tokens.slice(statementStart, i);

          if (statementTokens.length > 0) {
            this.statements.push(new Statement(
              statementTokens,
              {
                start: statementTokens[0].range.start,
                end: statementTokens[statementTokens.length-1].range.end
              }
            ));
          }

          statementStart = i+1;
          break;
      }
    }

    const lastStatementTokens = tokens.slice(statementStart, tokens.length);

    if (lastStatementTokens.length > 0) {
      this.statements.push(new Statement(
        lastStatementTokens,
        {
          start: lastStatementTokens[0].range.start,
          end: lastStatementTokens[lastStatementTokens.length-1].range.end
        }
      ));
    }
  }

  getStatementByOffset(offset: number) {
    return this.statements.find((statement, i) => {
      const end = (this.statements[i+1] ? this.statements[i+1].range.start : statement.range.end);
      return (offset >= statement.range.start && offset < end) || (i === (this.statements.length-1) && offset >= end);
    })
  }

	getTokenByOffset(offset: number): Token|undefined {
		const statement = this.getStatementByOffset(offset);

		if (statement) {
			return statement.getTokenByOffset(offset);
		}
	}
}