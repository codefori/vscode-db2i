import ollama, { ListResponse } from "ollama";
import * as vscode from "vscode";
import Statement from "../database/statement";
import { AiConfig, AiProvider } from "./aiConfig";
import {
  canTalkToDb,
  findPossibleTables,
  getDefaultSchema,
  getSystemStatus,
  refsToMarkdown,
} from "./context";
import { chatRequest } from "./send";

const CHAT_ID = `vscode-db2i.chat`;

interface IDB2ChatResult extends vscode.ChatResult {
  metadata: {
    command: string;
  };
}

interface ModelQuickPickItem extends vscode.QuickPickItem {
  provider: AiProvider;
  family: string;
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

        default:
          context;
          stream.progress(
            `Getting information from ${Statement.prettyName(usingSchema)}...`
          );
          let refs = await findPossibleTables(
            usingSchema,
            request.prompt.split(` `)
          );

          messages = [
            vscode.LanguageModelChatMessage.User(
              `You are a an IBM i savant speciallizing in database features in Db2 for i. Your job is to help developers write and debug their SQL along with offering SQL programming advice.`
            ),
          ];

          if (Object.keys(refs).length === 0) {
            stream.progress(`No references found. Doing bigger lookup...`);
            refs = await findPossibleTables(usingSchema, []);
          }

          if (Object.keys(refs).length > 0) {
            stream.progress(`Building response...`);
            messages.push(
              vscode.LanguageModelChatMessage.User(
                `Give the developer an SQL statement or information based on the prompt and following table references. Always include code examples where is makes sense. Do not make suggestions for reference you do not have.`
              ),
              vscode.LanguageModelChatMessage.User(
                `Here are the table references for current schema ${usingSchema}\n${refsToMarkdown(
                  refs
                )}`
              ),
              vscode.LanguageModelChatMessage.User(request.prompt)
            );
          } else {
            stream.progress(`No references found.`);
            messages.push(
              vscode.LanguageModelChatMessage.User(
                `Warn the developer that their request is not clear or that no references were found. Provide a suggestion or ask for more information.`
              ),
              vscode.LanguageModelChatMessage.User(
                `The developers current schema is ${usingSchema}.`
              )
            );
          }

          await streamModelResponse(messages, stream, token);

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

  const changeModelCommand = vscode.commands.registerCommand(
    `vscode-db2i.ai.changeModel`,
    selectProviderAndModel
  );

  context.subscriptions.push(chat, changeModelCommand);
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

  stream.progress(`Provider: ${chosenProvider} Model: ${chosenModel}`);

  return chatRequest(chosenProvider, messages, {}, token, stream);
}

async function selectProviderAndModel() {
  const selected = AiConfig.getModel();
  const copilotModels = await vscode.lm.selectChatModels();
  let ollamaModels: ListResponse = { models: [] };

  try {
    ollamaModels = await ollama.list();
  } catch (e) {}

  const provider = await vscode.window.showQuickPick(
    [
      { kind: vscode.QuickPickItemKind.Separator, label: "Ollama Models" },
      ...ollamaModels.models.map(
        (model): ModelQuickPickItem => ({
          label: model.name,
          family: model.name,
          provider: "Ollama",
          iconPath: new vscode.ThemeIcon("heart"),
          description: selected === model.name ? "Selected" : "",
        })
      ),
      {
        kind: vscode.QuickPickItemKind.Separator,
        label: "GitHub Copilot Models",
      },
      ...copilotModels.map(
        (model): ModelQuickPickItem => ({
          label: model.name,
          family: model.family,
          provider: "GitHub Copilot",
          iconPath: new vscode.ThemeIcon("copilot"),
          description: selected === model.family ? "Selected" : "",
        })
      ),
    ],
    {
      title: "Select the AI model",
    }
  );

  if (provider && "provider" in provider && "family" in provider) {
    AiConfig.setProvider(provider.provider);
    AiConfig.setModel(provider.family);
  }
}
