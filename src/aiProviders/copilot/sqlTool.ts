import { CancellationToken, ExtensionContext, LanguageModelTextPart, LanguageModelTool, LanguageModelToolInvocationOptions, LanguageModelToolInvocationPrepareOptions, LanguageModelToolResult, lm, MarkdownString } from "vscode";
import { JobManager } from "../../config";

interface IRunInTerminalParameters {
	statement: string;
}

export const RUN_SQL_TOOL_ID = 'vscode-db2i-chat-sqlRunnerTool';

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

		const result = await JobManager.runSQL(trimmed);

		return new LanguageModelToolResult([new LanguageModelTextPart(JSON.stringify(result))]);
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
