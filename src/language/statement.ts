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
				// INSERT INTO
				if (tokenIs(this.tokens[1], `word`, `INTO`)) {
					doAdd(this.getRefAtToken(2));
				}
				break;
			case StatementType.Select:
			case StatementType.Delete:
				// SELECT
				for (let i = 0; i < this.tokens.length; i++) {
					if (tokenIs(this.tokens[i], `word`, `FROM`) || tokenIs(this.tokens[i], `join`)) {
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

		if (this.tokens[i] && NameTypes.includes(this.tokens[i].type)) {
			sqlObj = {
				object: {
					name: this.tokens[i].value
				}
			}

			if (this.tokens[i+2] && (tokenIs(this.tokens[i+1], `dot`) || tokenIs(this.tokens[i+1], `forwardslash`)) && NameTypes.includes(this.tokens[i+2].type)) {
				nameIndex = i+2;
				sqlObj = {
					object: {
						schema: this.tokens[i].value,
						name: this.tokens[i+2].value
					}
				};

			}

			// If the next token is not a clause.. we might have the alias
			if (this.tokens[nameIndex+1]) {
				if (this.tokens[nameIndex+1].type === `as`) {
					sqlObj.alias = this.tokens[nameIndex+2].value;
				} else
				if (tokenIs(this.tokens[nameIndex+1], `word`)) {
					sqlObj.alias = this.tokens[nameIndex+1].value;
				}
			}
		};

		return sqlObj;
	}
}