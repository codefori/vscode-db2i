import SQLTokeniser, { NameTypes } from "./tokens";
import { IRange, ObjectRef, QualifiedObject, Token } from "./types";

export enum StatementType {
	Unknown,
	Create,
	Insert,
	Select,
	Update,
	Delete,
	Drop,
	Call
}

const StatementTypeWord = {
	'CREATE': StatementType.Create,
	'SELECT': StatementType.Select,
	'WITH': StatementType.Select,
	'INSERT': StatementType.Insert,
	'UPDATE': StatementType.Update,
	'DELETE': StatementType.Delete,
	'DROP': StatementType.Drop,
	'CALL': StatementType.Call
};

const tokenIs = (token: Token|undefined, type: string, value?: string) => {
	return (token && token.type === type && (value ? token.value?.toUpperCase() === value : true));
}

export default class Statement {
	private type: StatementType = StatementType.Unknown;

  constructor(public tokens: Token[], public range: IRange) {
		const first = tokens[0];

		if (first && first.type === `word`) {
			const wordValue = first.value?.toUpperCase();

			this.type = StatementTypeWord[wordValue];
		}

		if (this.type !== StatementType.Create) {
			this.tokens = SQLTokeniser.findScalars(this.tokens);
		}
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
}