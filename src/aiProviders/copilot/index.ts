import * as vscode from "vscode";
import Statement from "../../database/statement";
import {
  buildSchemaDefinition,
  canTalkToDb,
  findPossibleTables,
  generateTableDefinition,
  getCurrentSchema,
  getSystemStatus,
  refsToMarkdown,
} from "../context";
import { JobManager } from "../../config";
import { DB2_SYSTEM_PROMPT } from "../prompts";
import { buildPrompt, Db2ContextItems } from "../prompt";

const CHAT_ID = `vscode-db2i.chat`;

interface IDB2ChatResult extends vscode.ChatResult {
  metadata: {
    command: string;
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
    const copilotFamily = request.model.family;

    if (canTalkToDb()) {
      switch (request.command) {
        // case `activity`: //TODO: remove
        //   stream.progress(`Grabbing Information about IBM i system`);
        //   const data = await getSystemStatus();
        //   console.log(
        //     `summarize the following data in a readable paragraph: ${data}`
        //   );
        //   messages = [
        //     vscode.LanguageModelChatMessage.User(
        //       `You are a an IBM i savant speciallizing in database features in Db2 for i. Please provide a summary of the current IBM i system state based on the developer requirement.`
        //     ),
        //     vscode.LanguageModelChatMessage.User(
        //       `Here is the current IBM i state: ${data}`
        //     ),
        //     vscode.LanguageModelChatMessage.User(request.prompt),
        //   ];

        //   await copilotRequest(copilotFamily, messages, {}, token, stream);

        //   return { metadata: { command: "activity" } };

        // case `set-schema`:
        //   stream.progress(`Setting Current Schema for SQL Job`);
        //   const newSchema = request.prompt.split(" ")[0];
        //   if (newSchema) {
        //     const curJob = JobManager.getSelection();
        //     if (curJob) {
        //       const result = await curJob.job.setCurrentSchema(newSchema);
        //       if (result) {
        //         stream.progress(`Set Current Schema: ${newSchema}✅`);
        //         usingSchema = newSchema;
        //       }
        //     }
        //     return;
        //   }

        default:
          stream.progress(`Building response...`);

          // get history
          let history: Db2ContextItems[]|undefined;
          if (context.history.length > 0) {
            history = context.history.map((h) => {
              if ("prompt" in h) {
                return {
                  name: `reply`,
                  description: `reply from Copilot`,
                  content: h.prompt,
                  type: `assistant`,
                };
              } else {
                const responseContent = h.response
                  .filter((r) => r.value instanceof vscode.MarkdownString)
                  .map((r) => (r.value as vscode.MarkdownString).value)
                  .join("\n\n");
                return {
                  name: `message`,
                  description: `message from user`,
                  content: responseContent,
                  type: `assistant`,
                };
              }
            });
          }

          const contextItems = await buildPrompt(request.prompt, {
            history,
            progress: stream.progress
          });

          const messages = contextItems.map(c => {
            if (c.type === `user`) {
              return vscode.LanguageModelChatMessage.User(c.content);
            } else {
              return vscode.LanguageModelChatMessage.Assistant(c.content);
            }
          });

          await copilotRequest(
            request.model.family,
            messages,
            {},
            token,
            stream
          );

          return { metadata: { command: "build" } };
      }
    } else {
      throw new Error(
        `Not connected to the database. Please check your configuration.`
      );
    }
  };

  const chat = vscode.chat.createChatParticipant(CHAT_ID, chatHandler);
  chat.iconPath = new vscode.ThemeIcon(`database`);

  context.subscriptions.push(chat);
}

async function copilotRequest(
  model: string,
  messages: vscode.LanguageModelChatMessage[],
  options: vscode.LanguageModelChatRequestOptions,
  token: vscode.CancellationToken,
  stream: vscode.ChatResponseStream
): Promise<void> {
  const models = await vscode.lm.selectChatModels({ family: model });
  if (models.length > 0) {
    const [first] = models;
    const response = await first.sendRequest(messages, options, token);

    for await (const fragment of response.text) {
      stream.markdown(fragment);
    }
  }
}
