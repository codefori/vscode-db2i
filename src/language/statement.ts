import { IRange, Token } from "./types";

export enum StatementType {
	Unknown,
	Create,
	Select,
	Update,
	Delete,
	Drop
}

const StatementTypeWord = {
	'CREATE': StatementType.Create,
	'SELECT': StatementType.Select,
	'WITH': StatementType.Select,
	'UPDATE': StatementType.Update,
	'DELETE': StatementType.Delete,
	'DROP': StatementType.Drop
};

export default class Statement {
	private type: StatementType = StatementType.Unknown;

  constructor(public tokens: Token[], public range: IRange) {
		const first = tokens[0];

		if (first && first.type === `word`) {
			const wordValue = first.value?.toUpperCase();

			this.type = StatementTypeWord[wordValue];
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
}