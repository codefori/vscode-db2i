import * as vscode from "vscode";
import Statement from "../database/statement";
import { AiConfig, AiProvider } from "./aiConfig";
import {
  canTalkToDb,
  findPossibleTables,
  getDefaultSchema,
  getSystemStatus,
  refsToJson,
  refsToMarkdown,
} from "./context";
import { chatRequest } from "./send";
import { selectProviderAndModel } from "./models";
import { authenticateToWatsonX } from "./watsonX";

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
    let messages: vscode.LanguageModelChatMessage[];

    if (canTalkToDb()) {
      const usingSchema = getDefaultSchema();

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

          await streamModelResponse(messages, stream, token);

          return { metadata: { command: "activity" } };
        case `sql`:
          context;
          stream.progress(
            `Default Schema: ${Statement.prettyName(usingSchema)}...`
          );
          let refs = await findPossibleTables(
            stream,
            usingSchema,
            request.prompt.split(` `)
          );

          messages = [
            vscode.LanguageModelChatMessage.User(
              `You are a an IBM i savant speciallizing in database features in Db2 for i. Your job is to help developers write and debug their SQL along with offering SQL programming advice.`
            ),
          ];

          if (Object.keys(refs).length === 0) {
            stream.progress(`No references found. Please reference a table in ${usingSchema} or SCHEMA.table ...`);
            // returning for now, could warn the developer, and stream model repsonse
            messages.push(
              vscode.LanguageModelChatMessage.User(
                `Warn the developer that their request is not clear or that no references were found. Provide a suggestion or ask for more information.`
              ),
            );
            return;
          }

          if (Object.keys(refs).length > 0) {
            stream.progress(`Building response...`);
            messages.push(
              vscode.LanguageModelChatMessage.User(
                `Provide the developer with SQL statements or relevant information based on the user's prompt and referenced table structures. Always include practical code examples where applicable. Ensure all suggestions are directly applicable to the structures and data provided and avoid making suggestions outside the scope of the available information.`
              ),
              vscode.LanguageModelChatMessage.User(
                `Here are the table references\n\n${refsToJson(refs)}`
              ),
              vscode.LanguageModelChatMessage.User(request.prompt)
            );
          }

          await streamModelResponse(messages, stream, token);

          return { metadata: { command: "build" } };
        
        default:
          messages = [
            vscode.LanguageModelChatMessage.User(
              `You are a an IBM i savant speciallizing in database features in Db2 for i. Please provider the user with a helpful response based on the user input. Do not offer any suggestions on SQL, but provide general information or guidance.`
            ),
            vscode.LanguageModelChatMessage.User(request.prompt),
          ];
          await streamModelResponse(messages, stream, token);

          return { metadata: { command: "default" } };
      }
    } else {
      throw new Error(
        `Not connected to the database. Please check your configuration.`
      );
    }
  };

  const chat = vscode.chat.createChatParticipant(CHAT_ID, chatHandler);
  chat.iconPath = new vscode.ThemeIcon(`database`);

  const changeModelCommand = vscode.commands.registerCommand(
    `vscode-db2i.ai.changeModel`,
    selectProviderAndModel
  );

  authenticateToWatsonX();

  context.subscriptions.push(chat, changeModelCommand);
}

let lastSelectedModel: string | null = null;

async function showModelProviderIfNeeded(
  stream: vscode.ChatResponseStream,
  chosenProvider: AiProvider,
  chosenModel: string
) {
  const currentModel = AiConfig.getModel();

  if (lastSelectedModel === null || lastSelectedModel !== currentModel) {
    stream.markdown(
      `**Provider👨‍💻:** ${chosenProvider}\n\n**Model🧠:** ${chosenModel}\n\n***\n\n`
    );
    lastSelectedModel = currentModel;
  }
}

async function streamModelResponse(
  messages: vscode.LanguageModelChatMessage[],
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
) {
  const chosenProvider = AiConfig.getProvider();
  const chosenModel = AiConfig.getModel();

  if (chosenProvider === `none`) {
    stream.markdown(
      `No AI provider selected. Please select an AI provider and model.`
    );
    stream.button({
      command: `vscode-db2i.ai.changeModel`,
      title: `Select AI Provider and Model`,
    });
    return;
  }

  // showModelProviderIfNeeded(stream, chosenProvider, chosenModel);
  stream.progress(`Using ${chosenModel} (${chosenProvider})`);

  return chatRequest(chosenProvider, messages, {}, token, stream);
}