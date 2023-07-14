import Statement from "./statement";
import SQLTokeniser from "./tokens";
import { IRange, StatementType, StatementTypeWord, Token } from "./types";

export default class Document {
  statements: Statement[];
  constructor(content: string) {
    this.statements = [];

    const tokeniser = new SQLTokeniser();
    this.parseStatements(tokeniser.tokenise(content));
  }

  private addStatement(tokens: Token[]) {
    if (tokens.length > 0) {
      tokens = Statement.trimTokens(tokens);

      if (tokens.length > 0) {
        this.statements.push(new Statement(
          tokens,
          {
            start: tokens[0].range.start,
            end: tokens[tokens.length - 1].range.end
          }
        ));
      }
    }
  }

  private parseStatements(tokens: Token[]) {
    let currentStatementType: StatementType = StatementType.Unknown;
    let statementStart = 0;

    for (let i = 0; i < tokens.length; i++) {
      switch (tokens[i].type) {
        case `semicolon`:
          const statementTokens = tokens.slice(statementStart, i);

          this.addStatement(statementTokens);

          statementStart = i + 1;
          break;

        case `statementType`:
          currentStatementType = StatementTypeWord[tokens[i].value?.toUpperCase()];
          break;

        case `keyword`:
          switch (tokens[i].value?.toUpperCase()) {
            case `BEGIN`:
              // We include BEGIN in the current statement
              // then the next statement beings
              const statementTokens = tokens.slice(statementStart, i+1);
              this.addStatement(statementTokens);
              statementStart = i + 1;
              break;
            case `END`:
              // We ignore the END statement keyword when it's solo.
              if (statementStart === i && (tokens[i] === undefined || tokens[i].type === `semicolon`)) {
                statementStart = i + 1;
              }
              break;
          }
          break;
      }
    }

    const lastStatementTokens = tokens.slice(statementStart, tokens.length);
    this.addStatement(lastStatementTokens);
  }

  getStatementByOffset(offset: number) {
    return this.statements.find((statement, i) => {
      const end = (this.statements[i + 1] ? this.statements[i + 1].range.start : statement.range.end);
      return (offset >= statement.range.start && offset < end) || (i === (this.statements.length - 1) && offset >= end);
    })
  }

  getTokenByOffset(offset: number): Token | undefined {
    const statement = this.getStatementByOffset(offset);

    if (statement) {
      return statement.getTokenByOffset(offset);
    }
  }
}