import { CancellationToken, ExtensionContext, LanguageModelTextPart, LanguageModelTool, LanguageModelToolInvocationOptions, LanguageModelToolInvocationPrepareOptions, LanguageModelToolResult, lm, MarkdownString } from "vscode";
import { QueryResult } from "@ibm/mapepire-js";
import { JobManager } from "../../config";

interface IRunInTerminalParameters {
	statement: string;
}

export const RUN_SQL_TOOL_ID = 'vscode-db2i-chat-sqlRunnerTool';

type SqlToolQueryResult = Pick<QueryResult<unknown>, `has_results` | `update_count` | `data`>;

export function serializeSqlToolResult(result: SqlToolQueryResult) {
	return JSON.stringify({
		success: true,
		hasResultSet: result.has_results,
		updateCount: result.update_count,
		rows: result.data ?? []
	});
}

export function serializeSqlToolError(error: unknown) {
	return JSON.stringify({
		success: false,
		error: error instanceof Error ? error.message : String(error)
	});
}

export function registerSqlRunTool(context: ExtensionContext) {
  context.subscriptions.push(lm.registerTool(RUN_SQL_TOOL_ID, new RunSqlTool()));
}

class RunSqlTool
	implements LanguageModelTool<IRunInTerminalParameters> {
	async invoke(
		options: LanguageModelToolInvocationOptions<IRunInTerminalParameters>,
		_token: CancellationToken
	) {
		const params = options.input as IRunInTerminalParameters;

    let trimmed = params.statement.trim();

    if (trimmed.endsWith(`;`)) {
      trimmed = trimmed.slice(0, -1);
    }

		let output: string;
		try {
			const result = await JobManager.runSQLVerbose(trimmed);
			output = serializeSqlToolResult(result);
		} catch (e) {
			output = serializeSqlToolError(e);
		}

		return new LanguageModelToolResult([new LanguageModelTextPart(output)]);
	}

	async prepareInvocation(
		options: LanguageModelToolInvocationPrepareOptions<IRunInTerminalParameters>,
		_token: CancellationToken
	) {
		const confirmationMessages = {
			title: 'Run SQL statement',
			message: new MarkdownString(
				`Run this statement in your job?` +
				`\n\n\`\`\`sql\n${options.input.statement}\n\`\`\`\n`
			),
		};

		return {
			invocationMessage: `Running statement`,
			confirmationMessages,
		};
	}
}
