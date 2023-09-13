import SQLTokeniser, { NameTypes } from "./tokens";
import { IRange, ObjectRef, QualifiedObject, StatementType, StatementTypeWord, Token } from "./types";

const tokenIs = (token: Token|undefined, type: string, value?: string) => {
	return (token && token.type === type && (value ? token.value?.toUpperCase() === value : true));
}

export default class Statement {
	public type: StatementType = StatementType.Unknown;
	private beginBlock = false;

  constructor(public tokens: Token[], public range: IRange) {
		const first = tokens[0];

		if (tokenIs(first, `statementType`) || tokenIs(first, `keyword`, `END`) || tokenIs(first, `keyword`, `BEGIN`)) {
			const wordValue = first.value?.toUpperCase();

			this.type = StatementTypeWord[wordValue];
		}
		
		if (this.type !== StatementType.Create) {
			this.tokens = SQLTokeniser.findScalars(this.tokens);
		}
	}

	isBlockOpener() {
		if (this.tokens.length === 1 && tokenIs(this.tokens[0], `keyword`, `BEGIN`)) {
			return true;
		}

		if (this.type === StatementType.Create) {
			const last = this.tokens[this.tokens.length-1];
			if (tokenIs(last, `keyword`, `BEGIN`)) {
				return true;
			}
		}

		return false;
	}

	isBlockEnder() {
		return this.type === StatementType.End && this.tokens.length === 1;
	}

	getTokenByOffset(offset: number) {
		const blockSearch = (tokens: Token[]): Token|undefined => {
			const token = tokens.find(token => offset >= token.range.start && offset <= token.range.end);
			
			if (token?.type === `block` && token.block) {
				return blockSearch(token.block);
			}

			return token;
		}

		return blockSearch(this.tokens);
	}

	getReferenceByOffset(offset: number) {
		let i = this.tokens.findIndex(token => offset >= token.range.start && offset <= token.range.end);

		let currentType;
		let prevMustBe: "dot"|"name";

		// Reset to end
		if (i >= 0) {
			currentType = this.tokens[i].type;
			if (currentType === `dot`) prevMustBe = `name`;
			else if (NameTypes.includes(currentType)) prevMustBe = `dot`;
		} else {
			i = this.tokens.length-1;
			prevMustBe = `name`;
		}

		while (i >= 0 && this.tokens[i-1]) {
			i--;
			currentType = this.tokens[i].type;

			switch (prevMustBe) {
				case `dot`:
					if (currentType === `dot`) {
						prevMustBe = `name`;
					} else {
						return this.getRefAtToken(i+1);
					}
					break;
				case `name`:
					if (NameTypes.includes(currentType)) {
						prevMustBe = `dot`;
					} else {
						return this.getRefAtToken(i+1);
					}
					break;
			}
		}
	}

	getObjectReferences(): ObjectRef[] {
		let list: ObjectRef[] = [];

		const doAdd = (ref?: ObjectRef) => {
			if (ref) list.push(ref);
		}
		
		let inFromClause = false;

		switch (this.type) {
			case StatementType.Call:
				// CALL X()
				doAdd(this.getRefAtToken(1));
				break;

			case StatementType.Alter:
				if (this.tokens.length >= 3) {
					let object = this.getRefAtToken(2);

					if (object) {
						object.type = this.tokens[1].value;

						doAdd(object);

						for (let i = object.tokens.length+2; i < this.tokens.length; i++) {
							if (tokenIs(this.tokens[i], `keyword`, `REFERENCES`)) {
								doAdd(this.getRefAtToken(i+1));
							}
						}
					}
				}
				break;

			case StatementType.Insert:
			case StatementType.Select:
			case StatementType.Delete:
				// SELECT
				for (let i = 0; i < this.tokens.length; i++) {
					if (tokenIs(this.tokens[i], `keyword`, `FROM`)) {
						inFromClause = true;
					} else if (inFromClause && tokenIs(this.tokens[i], `clause`) || tokenIs(this.tokens[i], `join`) || tokenIs(this.tokens[i], `closebracket`)) {
						inFromClause = false;
					}

					if (tokenIs(this.tokens[i], `keyword`, `FROM`) || tokenIs(this.tokens[i], `keyword`, `INTO`) || tokenIs(this.tokens[i], `join`) || (inFromClause && tokenIs(this.tokens[i], `comma`))) {
						doAdd(this.getRefAtToken(i+1));
					}
				}
				break;

			case StatementType.Create:
				let object: ObjectRef;
				let postName: number|undefined;

				if (tokenIs(this.tokens[1], `keyword`, `OR`) && tokenIs(this.tokens[2], `keyword`, `REPLACE`)) {
					object = this.getRefAtToken(4, true);
					if (object) {
						postName = object.tokens.length+4;
						object.type = this.tokens[3].value;
					}
				} else
				if (tokenIs(this.tokens[1], `keyword`, `UNIQUE`)) {
					object = this.getRefAtToken(3, true);
					if (object) {
						postName = object.tokens.length+3;
						object.type = this.tokens[2].value;
					}
				
				} else {
					object = this.getRefAtToken(2, true);
					if (object) {
						postName = object.tokens.length+2;
						object.type = this.tokens[1].value
					}
				}

				doAdd(object);

				if (object && postName) {
					switch (object.type?.toUpperCase()) {
						case `INDEX`:
							// If the type is `INDEX`, the next reference is the `ON` keyword
							for (let i = postName; i < this.tokens.length; i++) {
								if (tokenIs(this.tokens[i], `keyword`, `ON`)) {
									doAdd(this.getRefAtToken(i+1));
									break;
								}
							}
							break;

						case `VIEW`:
						case `TABLE`:
							const asKeyword = this.tokens.findIndex(token => tokenIs(token, `keyword`, `AS`));

							if (asKeyword > 0) {
								for (let i = asKeyword; i < this.tokens.length; i++) {
									if (tokenIs(this.tokens[i], `keyword`, `FROM`)) {
										inFromClause = true;
									} else if (inFromClause && (tokenIs(this.tokens[i], `clause`) || tokenIs(this.tokens[i], `join`) || tokenIs(this.tokens[i], `closebracket`))) {
										inFromClause = false;
									}
				
									if (tokenIs(this.tokens[i], `keyword`, `FROM`) || tokenIs(this.tokens[i], `keyword`, `INTO`) || tokenIs(this.tokens[i], `join`) || (inFromClause && tokenIs(this.tokens[i], `comma`))) {
										doAdd(this.getRefAtToken(i+1));
									}
								}
							}
							break;
					}
				}
				break;

			case StatementType.Declare:
				if (tokenIs(this.tokens[2], `keyword`, `HANDLER`)) {
					// DECLARE XX HANDLER FOR....
					let def: ObjectRef = {
						object: {name: this.tokens[1].value},
						tokens: this.tokens.slice(1, 3)
					}

					def.type = `Handler`;
					doAdd(def);

				} else
				if (tokenIs(this.tokens[2], `word`, `PROCEDURE`)) {
					// DECLARE XX PROCEDURE..
					
				} else
				if (tokenIs(this.tokens[1], `word`, `GLOBAL`) && tokenIs(this.tokens[2], `word`, `TEMPORARY`), tokenIs(this.tokens[3], `word`, `TABLE`)) {
					// Handle DECLARE GLOBAL TEMP TABLE x.x ()...
					let def: ObjectRef = this.getRefAtToken(4);
					def.type = `Temporary Table`;
					doAdd(def);

				} else
				if (tokenIs(this.tokens[1], `word`)) {
					// DECLARE XX TYPE DEFAULT ..
					let def: ObjectRef = {
						object: {name: this.tokens[1].value},
						tokens: this.tokens.slice(1)
					}

					if (tokenIs(this.tokens[2], `keyword`, `CURSOR`)) {
						def.type = `Cursor`;
					} else {
						let defaultIndex = this.tokens.findIndex(t => tokenIs(t, `keyword`, `DEFAULT`));

						def.type = this.tokens
							.slice(
								2, 
								defaultIndex >= 0 ? defaultIndex : undefined
							)
							.map(t => t.value).join(``);
					}

					doAdd(def);
				}
				break;
		}

		return list;
	}

	private getRefAtToken(i: number, withSystemName = false): ObjectRef|undefined {
		let sqlObj: ObjectRef;

		let nameIndex = i;
		let nameToken = this.tokens[i];

		let endIndex = i;

		if (nameToken && NameTypes.includes(this.tokens[i].type)) {
			nameIndex = i;
			endIndex = i;

			sqlObj = {
				tokens: [],
				object: {
					name: nameToken.value
				}
			}

			if (tokenIs(this.tokens[i+1], `dot`) || tokenIs(this.tokens[i+1], `forwardslash`)) {
				nameIndex = i+2;
				nameToken = this.tokens[nameIndex];

				endIndex = nameToken ? nameIndex : i+1;

				sqlObj = {
					tokens: [],
					object: {
						schema: this.tokens[i].value,
						name: nameToken && NameTypes.includes(nameToken.type) ? nameToken.value : undefined
					}
				};

			}

			// If the next token is not a clause.. we might have the alias
			if (nameToken && this.tokens[nameIndex+1]) {
				if (tokenIs(this.tokens[nameIndex+1], `keyword`, `AS`) && tokenIs(this.tokens[nameIndex+2], `word`)) {
					endIndex = nameIndex+2;
					sqlObj.alias = this.tokens[nameIndex+2].value;
				} else
				if (tokenIs(this.tokens[nameIndex+1], `word`)) {
					endIndex = nameIndex+1;
					sqlObj.alias = this.tokens[nameIndex+1].value;
				}
			}

			sqlObj.tokens = this.tokens.slice(i, endIndex+1);
		};

		if (withSystemName) {
			if (tokenIs(this.tokens[endIndex+1], `keyword`, `FOR`) && tokenIs(this.tokens[endIndex+2], `word`, `SYSTEM`) && tokenIs(this.tokens[endIndex+3], `word`, `NAME`)) {
				if (this.tokens[endIndex+4] && NameTypes.includes(this.tokens[endIndex+4].type)) {
					sqlObj.object.system = this.tokens[endIndex+4].value;
				}
			}
		}

		return sqlObj;
	}

	static trimTokens(tokens: Token[]) {
    if (tokens.length > 0) {
      let realFirstToken = tokens.findIndex(t => t.type !== `newline`);
      if (realFirstToken < 0) realFirstToken = 0;

      let realLastToken = 0;

      for (let i = tokens.length - 1; i >= 0; i--) {
        if (tokens[i].type !== `newline`) {
          realLastToken = i + 1;
          break;
        }
      }

      tokens = tokens.slice(realFirstToken, realLastToken);
    }
    return tokens;
  }
}