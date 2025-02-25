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
import { DB2_SYSTEM_PROMPT } from "../continue/prompts";
import Configuration from "../../configuration";

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
    let messages: vscode.LanguageModelChatMessage[] = [];

    if (canTalkToDb()) {
      // 1. SCHEMA Definiton (semantic)
      let usingSchema = getCurrentSchema();
      
      const useSchemaDef: boolean = Configuration.get<boolean>(`ai.useSchemaDefinition`);
      if (useSchemaDef) {
        const schemaSemantic = await buildSchemaDefinition(usingSchema);
        if (schemaSemantic) {
          messages.push(
            vscode.LanguageModelChatMessage.Assistant(
              JSON.stringify(schemaSemantic)
            )
          );
        }
      }

      switch (request.command) {
        case `activity`:
          stream.progress(`Grabbing Information about IBM i system`);
          const data = await getSystemStatus();
          console.log(
            `summarize the following data in a readable paragraph: ${data}`
          );
          messages = [
            vscode.LanguageModelChatMessage.User(
              `You are a an IBM i savant speciallizing in database features in Db2 for i. Please provide a summary of the current IBM i system state based on the developer requirement.`
            ),
            vscode.LanguageModelChatMessage.User(
              `Here is the current IBM i state: ${data}`
            ),
            vscode.LanguageModelChatMessage.User(request.prompt),
          ];

          await copilotRequest(copilotFamily, messages, {}, token, stream);

          return { metadata: { command: "activity" } };

        case `set-schema`:
          stream.progress(`Setting Current Schema for SQL Job`);
          const newSchema = request.prompt.split(" ")[0];
          if (newSchema) {
            const curJob = JobManager.getSelection();
            if (curJob) {
              const result = await curJob.job.setCurrentSchema(newSchema);
              if (result) {
                stream.progress(`Set Current Schema: ${newSchema}✅`);
                usingSchema = newSchema;
              }
            }
            return;
          }

        default:
          stream.progress(
            `Getting information from ${Statement.prettyName(usingSchema)}...`
          );

          // 2. TABLE References
          let refs = await generateTableDefinition(
            usingSchema,
            request.prompt.split(` `)
          );

          // get history
          if (context.history.length > 0) {
            const historyMessages = context.history.map((h) => {
              if ("prompt" in h) {
                return vscode.LanguageModelChatMessage.Assistant(h.prompt);
              } else {
                const responseContent = h.response
                  .filter((r) => r.value instanceof vscode.MarkdownString)
                  .map((r) => (r.value as vscode.MarkdownString).value)
                  .join("\n\n");
                return vscode.LanguageModelChatMessage.Assistant(
                  responseContent
                );
              }
            });
            messages.push(...historyMessages);
          }

          // add table refs to messages
          if (Object.keys(refs).length > 0) {
            for (const tableRef of refs) {
              messages.push(
                vscode.LanguageModelChatMessage.Assistant(tableRef.content)
              );
            }
          }

          // 3. DB2 Guidelines
          messages.push(
            vscode.LanguageModelChatMessage.Assistant(DB2_SYSTEM_PROMPT)
          );

          stream.progress(`Building response...`);

          // 4. user prompt
          messages.push(vscode.LanguageModelChatMessage.User(request.prompt));

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
