import * as vscode from "vscode";
import {
  canTalkToDb,
} from "../context";
import { getContextItems, Db2ContextItems } from "../prompt";
import { registerSqlRunTool, RUN_SQL_TOOL_ID } from "./sqlTool";

const CHAT_ID = `vscode-db2i.chat`;

interface IDB2ChatResult extends vscode.ChatResult {
  metadata: {
    command: string;
    followUps: string[];
    statement?: string;
  };
}

export async function registerCopilotProvider(
  context: vscode.ExtensionContext
) {
  const copilot = vscode.extensions.getExtension(`github.copilot-chat`);

  if (copilot) {
    if (!copilot.isActive) {
      await copilot.activate();
    }

    activateChat(context);
  }
}

/**
 * Activates the chat functionality for the extension.
 *
 * @param context - The extension context provided by VS Code.
 *
 * PROMPT FORMAT:
 *  - 1. SCHEMA Definiton (semantic)
 *  - 2. TABLE References
 *  - 3. DB2 Guidelines
 *  - 4. user prompt
 *
 * The chat participant is created with the chatHandler and added to the extension's subscriptions.
 */
export function activateChat(context: vscode.ExtensionContext) {
  // chatHandler deals with the input from the chat windows,
  // and uses streamModelResponse to send the response back to the chat window
  const chatHandler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<IDB2ChatResult> => {
    if (canTalkToDb()) {
      switch (request.command) {
        default:
          stream.progress(`Building response...`);

          let messages: vscode.LanguageModelChatMessage[] = [];

          // get history
          if (context.history.length > 0) {
            messages = context.history.map((h) => {
              if ("prompt" in h) {
                return vscode.LanguageModelChatMessage.Assistant(h.prompt);
              } else {
                const responseContent = h.response
                  .filter((r) => r.value instanceof vscode.MarkdownString)
                  .map((r) => (r.value as vscode.MarkdownString).value)
                  .join("\n\n");
                return vscode.LanguageModelChatMessage.Assistant(responseContent);
              }
            });
          }

          const contextItems = await getContextItems(request.prompt, {
            progress: stream.progress,
            withDb2Prompt: true
          });

          messages.push(...contextItems.context.map(c => {
            return vscode.LanguageModelChatMessage.Assistant(c.content);
          }));

          messages.push(
            vscode.LanguageModelChatMessage.User(request.prompt)
          );


          const doRequest = (tools: vscode.LanguageModelToolInformation[] = []) => {
            return copilotRequest(
              request.model.family,
              messages,
              {
                tools,
                toolMode: vscode.LanguageModelChatToolMode.Required
              },
              token,
              stream
            );
          }

          // The first request we do can do two things: return either a stream OR return a tool request
          const tools = vscode.lm.tools.filter(t => request.toolReferences.some(r => r.name === t.name));
          let result = await doRequest(tools);

          // Then, if there is a tool request, we do the logic to invoke the tool
          if (result.toolCalls.length > 0) {
            for (const toolcall of result.toolCalls) {
              if (toolcall.name === RUN_SQL_TOOL_ID) {
                const result = await vscode.lm.invokeTool(toolcall.name, { toolInvocationToken: request.toolInvocationToken, input: toolcall.input });
                const resultOut = result.content.map(c => {
                  if (c instanceof vscode.LanguageModelTextPart) {
                    return c.value;
                  }
                }).filter(c => c !== undefined).join("\n\n");

                messages = [
                  vscode.LanguageModelChatMessage.User(`Please review and summarize the following result set:\n\n${resultOut}\n\nThe original user request was: ${request}`)
                ];
              }
            }

            result = await doRequest();
          }

          return { metadata: { command: "build", followUps: contextItems.followUps, statement: result.sqlCodeBlock } };
      }
    } else {
      throw new Error(
        `Not connected to the database. Please check your configuration.`
      );
    }
  };

  const chat = vscode.chat.createChatParticipant(CHAT_ID, chatHandler);
  chat.iconPath = new vscode.ThemeIcon(`database`);
  chat.followupProvider = {
    provideFollowups(result, context, token) {
      const followups: vscode.ChatFollowup[] = [];

      if (result.metadata) {
        for (const followup of result.metadata.followUps) {
          followups.push({
            prompt: followup,
            participant: CHAT_ID,
          });
        }
      }

      return followups;
    },
  }

  context.subscriptions.push(chat);
  registerSqlRunTool(context);
}

interface Result {
  output: string;
  toolCalls: vscode.LanguageModelToolCallPart[];
  sqlCodeBlock?: string;
}

async function copilotRequest(
  model: string,
  messages: vscode.LanguageModelChatMessage[],
  options: vscode.LanguageModelChatRequestOptions,
  token: vscode.CancellationToken,
  stream: vscode.ChatResponseStream
): Promise<Result | undefined> {
  const models = await vscode.lm.selectChatModels({ family: model });
  if (models.length > 0) {
    const [first] = models;
    options.justification = `Doing cool stuff`
    const response = await first.sendRequest(messages, options, token);

    const result: Result = {
      output: "",
      toolCalls: []
    };

    for await (const fragment of response.stream) {
      if (fragment instanceof vscode.LanguageModelTextPart) {
        stream.markdown(fragment.value);
        result.output += fragment.value;
      } else if (fragment instanceof vscode.LanguageModelToolCallPart) {
        result.toolCalls.push(fragment);
      }
    }

    const codeBlockStart = result.output.indexOf("```sql");
    const codeBlockEnd = result.output.indexOf("```", codeBlockStart + 6);
    if (codeBlockStart !== -1 && codeBlockEnd !== -1) {
      result.sqlCodeBlock = result.output.substring(codeBlockStart + 6, codeBlockEnd);
    }

    return result;
  }
}
