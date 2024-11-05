import ollama, { ListResponse } from "ollama";
import * as vscode from "vscode";
import Statement from "../../database/statement";
import {
  canTalkToDb,
  findPossibleTables,
  getCurrentSchema,
  getSystemStatus,
} from "../context";
import { JobManager } from "../../config";

const CHAT_ID = `vscode-db2i.chat`;

interface IDB2ChatResult extends vscode.ChatResult {
  metadata: {
    command: string;
  };
}

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
    let messages: vscode.LanguageModelChatMessage[];

    if (canTalkToDb()) {
      let usingSchema = getCurrentSchema();

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
          const newSchema = request.prompt.split(' ')[0];
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
          let refs = await findPossibleTables(
            stream,
            usingSchema,
            request.prompt.split(` `)
          );

          messages = [
            vscode.LanguageModelChatMessage.Assistant(
              `You are a an IBM i savant speciallizing in database features in Db2 for i. Your job is to help developers write and debug their SQL along with offering SQL programming advice.`
            ),
            vscode.LanguageModelChatMessage.Assistant(
              `The developers current schema is ${usingSchema}.`
            ),
            vscode.LanguageModelChatMessage.Assistant(
              `Provide the developer with SQL statements or relevant information based on the user's prompt and referenced table structures. Always include practical code examples where applicable. Ensure all suggestions are directly applicable to the structures and data provided and avoid making suggestions outside the scope of the available information.`
            ),
          ];

          if (context.history.length > 0) {
            const historyMessages = context.history.map(h => {
                if ('prompt' in h) {
                    return vscode.LanguageModelChatMessage.Assistant(h.prompt);
                } else {
                    const responseContent = h.response
                        .filter(r => r.value instanceof vscode.MarkdownString)
                        .map(r => (r.value as vscode.MarkdownString).value)
                        .join('\n\n');
                    return vscode.LanguageModelChatMessage.Assistant(responseContent);
                }
            });
        
            messages.push(...historyMessages);
        }

          if (Object.keys(refs).length > 0) {
            messages.push(
              vscode.LanguageModelChatMessage.Assistant(
                `Here are new table references ${JSON.stringify(refs)}`
              ),
            );
          }

          stream.progress(`Building response...`);

          messages.push(vscode.LanguageModelChatMessage.User(request.prompt))

          await copilotRequest(request.model.family, messages, {}, token, stream);

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