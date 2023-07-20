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

		switch (this.type) {
			case StatementType.Call:
				// CALL X()
				doAdd(this.getRefAtToken(1));
				break;
			case StatementType.Insert:
			case StatementType.Select:
			case StatementType.Delete:
				// SELECT
				for (let i = 0; i < this.tokens.length; i++) {
					if (tokenIs(this.tokens[i], `keyword`, `FROM`) || tokenIs(this.tokens[i], `keyword`, `INTO`) || tokenIs(this.tokens[i], `join`)) {
						doAdd(this.getRefAtToken(i+1));
					}
				}
				break;
			case StatementType.Create:
				let object: ObjectRef;

				if (tokenIs(this.tokens[1], `keyword`, `OR`) && tokenIs(this.tokens[2], `keyword`, `REPLACE`)) {
					object = this.getRefAtToken(4);
					if (object) {
						object.type = this.tokens[3].value;
					}
				} else {
					object = this.getRefAtToken(2);
					if (object) {
						object.type = this.tokens[1].value
					}
				}

				doAdd(object);
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

	private getRefAtToken(i: number): ObjectRef|undefined {
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
				if (this.tokens[nameIndex+1].type === `keyword`) {
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