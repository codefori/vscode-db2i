import SQLTokeniser, { NameTypes } from "./tokens";
import { CTEReference, CallableReference, ClauseType, ClauseTypeWord, IRange, ObjectRef, QualifiedObject, StatementType, StatementTypeWord, Token } from "./types";

const tokenIs = (token: Token|undefined, type: string, value?: string) => {
	return (token && token.type === type && (value ? token.value?.toUpperCase() === value : true));
}

export default class Statement {
	public type: StatementType = StatementType.Unknown;
	private label: string|undefined;

  constructor(public tokens: Token[], public range: IRange) {
		this.tokens = this.tokens.filter(newToken => newToken.type !== `newline`);
		
		let first = this.tokens[0];

		if (tokenIs(first, `word`, `EXEC`) && tokenIs(this.tokens[1], `word`, `SQL`)) {
			first = this.tokens[2];
		} else if (tokenIs(first, `word`) && tokenIs(this.tokens[1], `colon`)) {
			first = this.tokens[2];
		}

		if (tokenIs(first, `word`) && tokenIs(this.tokens[1], `colon`)) {
			// Possible label?
			this.label = first.value;
			first = this.tokens[2];
		}

		const wordValue = first.value?.toUpperCase();

		this.type = StatementTypeWord[wordValue] || StatementType.Unknown;
		
		switch (this.type) {
			case StatementType.Create:
				// No scalar transformation here..
				break;
			default:
				this.tokens = SQLTokeniser.findScalars(this.tokens);
				break;
		}
	}

	isCompoundStart() {
		if (this.tokens.length === 1 && tokenIs(this.tokens[0], `keyword`, `BEGIN`)) {
			return true;
		}

		// These statements can end with BEGIN, which signifies a block starter
		if ([StatementType.Create, StatementType.Declare].includes(this.type)) {
			const last = this.tokens[this.tokens.length-1];
			if (tokenIs(last, `keyword`, `BEGIN`)) {
				return true;
			}
		}

		return false;
	}

	static typeIsConditional(type: StatementType) {
		return [StatementType.If, StatementType.While, StatementType.Loop, StatementType.For].includes(type);
	}

	isConditionStart() {
		return Statement.typeIsConditional(this.type);
	}

	isConditionEnd() {
		return this.type === StatementType.End && this.tokens.length > 1;
	}

	isCompoundEnd() {
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

	getClauseForOffset(offset: number): ClauseType {
		let currentClause = ClauseType.Unknown;
		
		for (let i = 0; i < this.tokens.length; i++) {
			if (offset < this.tokens[i].range.start) {
				break;
			}
			
			if (tokenIs(this.tokens[i], `clause`)) {
				currentClause = ClauseTypeWord[this.tokens[i].value!.toUpperCase()]
			}
		}

		return currentClause;
	}

	getBlockRangeAt(offset: number) {
		let start = -1;
		let end = -1;

		// Get the current token for the provided offset
		let i = this.tokens.findIndex((token, i) => (offset >= token.range.start && offset <= token.range.end) || (offset > token.range.end && this.tokens[i+1] && offset < this.tokens[i+1].range.start));

		let depth = 0;

		if (tokenIs(this.tokens[i], `closebracket`)) {
			i--;
		}

		if (tokenIs(this.tokens[i], `openbracket`)) {
			start = i+1;
			i++;
		} else {
			for (let x = i; x >= 0; x--) {
				if (tokenIs(this.tokens[x], `openbracket`)) {
					if (depth === 0) {
						start = x+1;
						break;
					} else {
						depth--;
					}
				} else
				if (tokenIs(this.tokens[x], `closebracket`)) {
					depth++;
				}
			}
		}

		depth = 0;

		for (let x = i; x <= this.tokens.length; x++) {
			if (tokenIs(this.tokens[x], `openbracket`)) {
				depth++;
			} else
			if (tokenIs(this.tokens[x], `closebracket`)) {
				if (depth === 0) {
					end = x;
					break;
				} else {
					depth--;
				}
			}
		}

		if (start === -1 || end === -1) {
			return undefined;
		} else {
			return {
				start,
				end
			}
		}
	}

	getCallableDetail(offset: number, withBlocks = false): CallableReference {
		const range = this.getBlockRangeAt(offset);

		if (range) {
			const hasDot = (tokenIs(this.tokens[range.start-4], `word`) || tokenIs(this.tokens[range.start-4], `sqlName`)) && tokenIs(this.tokens[range.start-3], `dot`);
				const parentRef = hasDot ? this.getRefAtToken(range.start-4) : this.getRefAtToken(range.start-2);

			if (parentRef) {
				return {
					tokens: withBlocks ? SQLTokeniser.createBlocks(this.tokens.slice(range.start, range.end)) : this.tokens.slice(range.start, range.end),
					parentRef
				};
			}
		}
	}

	getBlockAt(offset: number): Token[] {
		const range = this.getBlockRangeAt(offset);

		if (range) {
			return this.tokens.slice(range.start, range.end)
		} else {
			return []
		}
	}

	getReferenceByOffset(offset: number) {
		let i = this.tokens.findIndex(token => offset >= token.range.start && offset <= token.range.end);

		let currentType;
		let prevMustBe: "dot"|"name";

		// Reset to end
		if (i >= 0) {
			currentType = this.tokens[i].type;
			if (currentType === `dot` || currentType === `forwardslash`) prevMustBe = `name`;
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

	getCTEReferences(): CTEReference[] {
		if (this.type !== StatementType.With) return [];

		const withBlocks = SQLTokeniser.createBlocks(this.tokens.slice(0));
		
		let cteList: CTEReference[] = [];

		for (let i = 0; i < withBlocks.length; i++) {
			if (tokenIs(withBlocks[i], `word`) || tokenIs(withBlocks[i], `function`)) {
				let cteName = withBlocks[i].value!;
				let parameters: string[] = [];
				let statementBlockI = i+1;

				if (tokenIs(withBlocks[i+1], `block`) && tokenIs(withBlocks[i+2], `keyword`, `AS`)) {
					parameters = withBlocks[i+1].block!.filter(blockToken => blockToken.type === `word`).map(blockToken => blockToken.value!)
					statementBlockI = i+3;
				} else if (tokenIs(withBlocks[i+1], `keyword`, `AS`)) {
					statementBlockI = i+2;
				}

				const statementBlock = withBlocks[statementBlockI];
				if (tokenIs(statementBlock, `block`)) {
					cteList.push({
						name: cteName,
						columns: parameters,
						statement: new Statement(Statement.trimTokens(statementBlock.block), statementBlock.range)
					})
				}

				i = statementBlockI;
			}

			if (tokenIs(withBlocks[i], `statementType`, `SELECT`)) {
				break;
			}
		}

		return cteList;
	}

	getRoutineParameters(): ObjectRef[] {
		const list: ObjectRef[] = [];

		if (this.type !== StatementType.Create) {
			return [];
		}

		function splitTokens(inTokens: Token[], type: string) {
			const chunks: Token[][] = [];

			let currentChunk: Token[] = [];

			for (const token of inTokens) {
				if (tokenIs(token, type)) {
					if (currentChunk.length > 0) {
						chunks.push(currentChunk);
						currentChunk = [];
					}
				} else {
					currentChunk.push(token);
				}
			}

			if (currentChunk.length > 0) {
				chunks.push(currentChunk);
			}

			return chunks;
		}

		const withBlocks = SQLTokeniser.createBlocks(this.tokens.slice(0));
		const firstBlock = withBlocks.find(token => token.type === `block`);

		if (firstBlock && firstBlock.block) {
			const parameters = splitTokens(firstBlock.block!, `comma`);

			for (const parameter of parameters) {
				// If the first token is the parm type, then the name follows
				let nameIndex = tokenIs(parameter[0], `parmType`) ? 1 : 0;
				const name = parameter[nameIndex].value!;
				// Include parmType if it is provided
				const definitionTokens = (nameIndex === 1 ? [parameter[0]] : []).concat(parameter.slice(nameIndex+1));

				list.push({
					tokens: parameter,
					createType: Statement.formatSimpleTokens(definitionTokens),
					alias: name,
					object: {
						name,
					}
				});
			}
		}

		return list;

	}

	getObjectReferences(): ObjectRef[] {
		let list: ObjectRef[] = [];

		const doAdd = (ref?: ObjectRef) => {
			if (ref) list.push(ref);
		}

		const basicQueryFinder = (startIndex: number): void => {
			let currentClause: undefined|"select"|"from";
			for (let i = startIndex; i < this.tokens.length; i++) {
				if (tokenIs(this.tokens[i], `clause`, `FROM`)) {
					currentClause = `from`;
				}
				else if (tokenIs(this.tokens[i], `statementType`, `SELECT`)) {
					currentClause = `select`;
				} else if (currentClause === `from` && tokenIs(this.tokens[i], `clause`) || tokenIs(this.tokens[i], `join`) || tokenIs(this.tokens[i], `closebracket`)) {
					currentClause = undefined;
				}

				if (tokenIs(this.tokens[i], `clause`, `FROM`) || 
					 (this.type !== StatementType.Select && tokenIs(this.tokens[i], `clause`, `INTO`)) || 
					 tokenIs(this.tokens[i], `join`) || 
					 (currentClause === `from` && tokenIs(this.tokens[i], `comma`)
				)) {
					const sqlObj = this.getRefAtToken(i+1);
					if (sqlObj) {
						doAdd(sqlObj);
						i += sqlObj.tokens.length;
						if (sqlObj.isUDTF || sqlObj.fromLateral) {
							i += 3; //For the brackets
						}
					}
				} else if (currentClause === `select` && tokenIs(this.tokens[i], `function`)) {
					const sqlObj = this.getRefAtToken(i);
					if (sqlObj) {
						doAdd(sqlObj);
						i += sqlObj.tokens.length;
						if (sqlObj.isUDTF || sqlObj.fromLateral) {
							i += 3; //For the brackets
						}
					}
				}
			}
		}
		
		let inFromClause = false;

		switch (this.type) {
			case StatementType.Call:
				// CALL X()
				doAdd(this.getRefAtToken(1));
				break;

			case StatementType.Alter:
				if (this.tokens.length >= 3) {
					let object = this.getRefAtToken(2, {withSystemName: true});

					if (object) {
						object.createType = this.tokens[1].value;

						doAdd(object);

						for (let i = object.tokens.length+2; i < this.tokens.length; i++) {
							if (tokenIs(this.tokens[i], `keyword`, `REFERENCES`)) {
								doAdd(this.getRefAtToken(i+1, {withSystemName: true}));
							}
						}
					}
				}
				break;

			case StatementType.With:
				basicQueryFinder(0);
				break;

			case StatementType.Insert:
			case StatementType.Select:
			case StatementType.Delete:
				basicQueryFinder(0);
				break;

			case StatementType.Create:
				let object: ObjectRef;
				let postName: number|undefined;

				if (tokenIs(this.tokens[1], `keyword`, `OR`) && tokenIs(this.tokens[2], `keyword`, `REPLACE`)) {
					object = this.getRefAtToken(4, {withSystemName: true});
					if (object) {
						postName = object.tokens.length+4;
						object.createType = this.tokens[3].value;
					}
				} else
				if (tokenIs(this.tokens[1], `keyword`, `UNIQUE`)) {
					object = this.getRefAtToken(3, {withSystemName: true});
					if (object) {
						postName = object.tokens.length+3;
						object.createType = this.tokens[2].value;
					}
				
				} else {
					object = this.getRefAtToken(2, {withSystemName: true});
					if (object) {
						postName = object.tokens.length+2;
						object.createType = this.tokens[1].value
					}
				}

				doAdd(object);

				if (object && postName) {
					switch (object.createType?.toUpperCase()) {
						case `FUNCTION`:
						case `PROCEDURE`:
							// For functions, perhaps we can use the SPECIFIC keyword for the system name
							for (let i = postName; i < this.tokens.length; i++) {
								if (tokenIs(this.tokens[i], `keyword`, `SPECIFIC`) && this.tokens[i+1]) {
									object.object.system = this.tokens[i+1].value;
									i++;
								}

								// Support for external name
								if (tokenIs(this.tokens[i], `keyword`, `EXTERNAL`) && tokenIs(this.tokens[i+1], `word`, `NAME`) && this.tokens[i+2]) {
									const externalRef = this.getRefAtToken(i+2);
									if (externalRef) {
										externalRef.createType = `external`;
										externalRef.alias = undefined;
										externalRef.object.system = externalRef.object.name;
										i += externalRef.tokens.length + 2;
										doAdd(externalRef);
									}
								}
							}
							break;

						case `INDEX`:
							// If the type is `INDEX`, the next reference is the `ON` keyword
							for (let i = postName; i < this.tokens.length; i++) {
								if (tokenIs(this.tokens[i], `keyword`, `ON`)) {
									doAdd(this.getRefAtToken(i+1));
									break;
								}
							}
							break;

						case `VARIABLE`:
							if (postName) {
								object.createType = Statement.formatSimpleTokens(this.tokens.slice(postName));
							}
							break;

						case `VIEW`:
						case `TABLE`:
							const asKeyword = this.tokens.findIndex(token => tokenIs(token, `keyword`, `AS`));

							if (asKeyword > 0) {
								basicQueryFinder(asKeyword);
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

					def.createType = `Handler`;
					doAdd(def);

				} else
				if (tokenIs(this.tokens[2], `word`, `PROCEDURE`)) {
					// DECLARE XX PROCEDURE..
					
				} else
				if (tokenIs(this.tokens[1], `word`, `GLOBAL`) && tokenIs(this.tokens[2], `word`, `TEMPORARY`), tokenIs(this.tokens[3], `word`, `TABLE`)) {
					// Handle DECLARE GLOBAL TEMP TABLE x.x ()...
					let def: ObjectRef = this.getRefAtToken(4);
					def.createType = `Temporary Table`;
					doAdd(def);

				} else
				if (tokenIs(this.tokens[1], `word`)) {
					// DECLARE XX TYPE DEFAULT ..
					let def: ObjectRef = {
						object: {name: this.tokens[1].value},
						tokens: this.tokens.slice(1)
					}

					if (tokenIs(this.tokens[2], `keyword`, `CURSOR`)) {
						def.createType = `Cursor`;
					} else {
						let defaultIndex = this.tokens.findIndex(t => tokenIs(t, `keyword`, `DEFAULT`));

						const valueTokens = this.tokens
							.slice(
								2, 
								defaultIndex >= 0 ? defaultIndex : undefined
							);

						def.createType = Statement.formatSimpleTokens(valueTokens);
					}

					doAdd(def);
				}
				break;
		}

		return list;
	}

	private getRefAtToken(i: number, options: {withSystemName?: boolean} = {}): ObjectRef|undefined {
		let sqlObj: ObjectRef;

		let nextIndex = i;
		let nextToken = this.tokens[i];

		let endIndex = i;

		const isUDTF = tokenIs(nextToken, `function`, `TABLE`);
		const isLateral = tokenIs(nextToken, `function`, `LATERAL`);

		if (isUDTF) {
			sqlObj = this.getRefAtToken(i+2);
			if (sqlObj) {
				sqlObj.isUDTF = true;
				const blockTokens = this.getBlockAt(sqlObj.tokens[0].range.end);
				
				sqlObj.tokens = blockTokens;
				nextIndex = i + 2 + blockTokens.length;
				nextToken = this.tokens[nextIndex];

			} else {
				nextIndex = -1;
				nextToken = undefined;
			}
		} else if (isLateral) {
			const blockTokens = this.getBlockAt(nextToken.range.end+1);
			const newStatement = new Statement(blockTokens, {start: nextToken.range.start, end: blockTokens[blockTokens.length-1].range.end});
			[sqlObj] = newStatement.getObjectReferences();

			sqlObj.fromLateral = true;
			nextIndex = i + 2 + blockTokens.length;
			nextToken = this.tokens[nextIndex];
		
		} else {
			if (nextToken && NameTypes.includes(nextToken.type)) {
				nextIndex = i;
				endIndex = i;

				sqlObj = {
					tokens: [],
					object: {
						name: nextToken.value
					}
				}

				if (tokenIs(this.tokens[i+1], `dot`) || tokenIs(this.tokens[i+1], `forwardslash`)) {
					nextIndex = i+2;
					nextToken = this.tokens[nextIndex];

					endIndex = nextToken ? nextIndex : i+1;

					sqlObj = {
						tokens: [],
						object: {
							schema: this.tokens[i].value,
							name: nextToken && NameTypes.includes(nextToken.type) ? nextToken.value : undefined
						}
					};

				}
			};
		}
			
		if (sqlObj) {

			if (options.withSystemName !== true) {
				// If the next token is not a clause.. we might have the alias
				if (nextToken && this.tokens[nextIndex+1]) {
					if (tokenIs(this.tokens[nextIndex+1], `keyword`, `AS`) && tokenIs(this.tokens[nextIndex+2], `word`)) {
						endIndex = nextIndex+2;
						sqlObj.alias = this.tokens[nextIndex+2].value;
					} else
					if (tokenIs(this.tokens[nextIndex+1], `word`)) {
						endIndex = nextIndex+1;
						sqlObj.alias = this.tokens[nextIndex+1].value;
					}
				}
			}

			if (!isUDTF) {
				sqlObj.tokens = this.tokens.slice(i, endIndex+1);
			}

			if (options.withSystemName) {
				if (tokenIs(this.tokens[endIndex+1], `statementType`, `FOR`) && tokenIs(this.tokens[endIndex+2], `word`, `SYSTEM`) && tokenIs(this.tokens[endIndex+3], `word`, `NAME`)) {
					if (this.tokens[endIndex+4] && NameTypes.includes(this.tokens[endIndex+4].type)) {
						sqlObj.object.system = this.tokens[endIndex+4].value;
					}
				}
			}
		}

		return sqlObj;
	}

	/** 
	 * Gets areas of statement that are likely from embedded statements
	 * EXEC SQL
	 * INTO area
	 * Host variables
	 * DECLARE .. CURSOR FOR
	 */
	getEmbeddedStatementAreas() {
		// Only these statements support the INTO clause in embedded SQL really
		const validIntoStatements: StatementType[] = [StatementType.Unknown, StatementType.With, StatementType.Select];

		let ranges: {type: "remove"|"marker", range: IRange}[] = [];
		let intoClause: Token|undefined;
		let declareStmt: Token|undefined;

		for (let i = 0; i < this.tokens.length; i++) {
			const prevToken = this.tokens[i-1];
			const currentToken = this.tokens[i];

			switch (currentToken.type) {
				case `statementType`:
					const currentValue = currentToken.value.toLowerCase();
					if (declareStmt) {
						if (currentValue === `for`) {
							ranges.push({
								type: `remove`,
								range: {
									start: declareStmt.range.start,
									end: currentToken.range.end
								}
							});
	
							declareStmt = undefined;
						}

						continue;
					};

					// If we're in a DECLARE, it's likely a cursor definition
					if (currentValue === `declare`) {
						declareStmt = currentToken;
					}
					break;

				case `clause`:
					if (!validIntoStatements.includes(this.type)) continue;
					if (declareStmt) continue;

					// We need to remove the INTO clause completely.
					if (currentToken.value.toLowerCase() === `into`) {
						intoClause = currentToken;
					} else if (intoClause) {
						const endToken = this.tokens[i-1];

						ranges.push({
							type: `remove`,
							range: {
								start: intoClause.range.start,
								end: endToken.range.end
							}
						});

						intoClause = undefined;
					}
					break;

				case `questionmark`:
					if (intoClause) continue;
					if (declareStmt) continue;

					ranges.push({
						type: `marker`,
						range: currentToken.range
					});
					break;

				case `colon`:
					if (intoClause) continue;
					if (declareStmt) continue;
					if (prevToken && prevToken.type === `string`) continue;

					let nextMustBe: "word"|"dot" = `word`;
					let followingTokenI = i+1;
					let endToken: Token;

					// Handles when we have a host variable
					// This logic supports qualified host variables
					// i.e. :myvar or :mystruct.subf

					let followingToken = this.tokens[followingTokenI];
					while (followingToken && followingToken.type === nextMustBe) {
						switch (followingToken.type) {
							case `word`: nextMustBe = `dot`; break;
							case `dot`: nextMustBe = `word`; break;
						}

						endToken = followingToken;

						followingTokenI++;
						followingToken = this.tokens[followingTokenI];
					}

					if (endToken) {
						ranges.push({
							type: `marker`,
							range: {
								start: currentToken.range.start,
								end: endToken.range.end
							}
						});

						i = followingTokenI;
					}

					break;

				default:
					if (i === 0 && tokenIs(currentToken, `word`, `EXEC`)) {
						// We check and remove the starting `EXEC SQL`
						if (tokenIs(this.tokens[i+1], `word`, `SQL`)) {
							ranges.push({
								type: `remove`,
								range: {
									start: currentToken.range.start,
									end: this.tokens[i+1].range.end
								}
							});
						}
					}
					break;
			}
		}

		return ranges;
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

	private static formatSimpleTokens(tokens: Token[]) {
		let outString = ``;
		for (let i = 0; i < tokens.length; i++) {
			const cT = tokens[i];
			const nT = tokens[i+1];
			const pT = tokens[i-1];
	
			switch (cT.type) {
				case `block`:
					outString += `(${Statement.formatSimpleTokens(cT.block!)})`;

					if (nT && nT.type !== `closebracket`) {
						outString += ` `;
					}
					break;
				case `openbracket`:
					outString += cT.value;
					break;
				case `closebracket`:
					outString += cT.value
					
					if (nT && nT.type !== cT.type) {
						outString += ` `
					}
					break;
				default:
					if (nT && (![`closebracket`, `openbracket`, `comma`, `block`].includes(nT.type))) {
						outString += `${cT.value} `;
					} else {
						outString += cT.value;
					}
					break;
			}
		}
		return outString.trimEnd();
	}
}