import * as vscode from "vscode";
import { JobManager } from "../config";

const CHAT_ID = `vscode-db2i.chat`;
const LANGUAGE_MODEL_ID = `copilot-gpt-3.5-turbo`;

interface IDB2ChatResult extends vscode.ChatResult {
  metadata: {
    command: string;
  };
}

export function activateChat(context: vscode.ExtensionContext) {

  const chatHandler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<IDB2ChatResult> => {

    if (request.command == `build`) {
      stream.progress(`Querying database for information...`);
      const text = processUserMessage(request.prompt);
      const messages = [
        new vscode.LanguageModelChatSystemMessage(
          `You are a an IBM i savant speciallizing in database features in Db2 for i. Your job is to help developers write and debug their SQL along with offering SQL programming advice. Help the developer write an SQL statement based on the prompt information. Always include code examples where is makes sense.`
        ),
        new vscode.LanguageModelChatUserMessage(request.prompt),
      ];

      await streamModelResponse(messages, stream, token);

      return { metadata: { command: "build" } };

    } else if (request.command == `activity`) {
      
      stream.progress(`Grabbing Information about IBM i system`);
      const data = await processUserMessage(request.prompt);
      console.log(`summarize the following data in a readable paragraph: ${data}`)
      const messages = [
        new vscode.LanguageModelChatSystemMessage(
          `You are a an IBM i savant speciallizing in database features in Db2 for i. Your job is to help developers write and debug their SQL along with offering SQL programming advice. Help the developer write an SQL statement based on the prompt information. Always include code examples where is makes sense.`
        ),
        new vscode.LanguageModelChatUserMessage(
          `summarize the following data in a readable paragraph: ${data}`
        ),
      ];

      await streamModelResponse(messages, stream, token);

      return { metadata: { command: "activity" } };
    }
  };

  const chat = vscode.chat.createChatParticipant(CHAT_ID, chatHandler);
  chat.isSticky = true;
  chat.iconPath = new vscode.ThemeIcon(`database`);
}


async function processUserMessage(prompt: string): Promise<string> {

  const sqlStatment = `SELECT * FROM TABLE(QSYS2.SYSTEM_STATUS(RESET_STATISTICS=>'YES',DETAILED_INFO=>'ALL')) X`;
  const result = await JobManager.runSQL(sqlStatment, undefined);
  return JSON.stringify(result);
}


async function streamModelResponse(
  messages: (
    | vscode.LanguageModelChatUserMessage
    | vscode.LanguageModelChatSystemMessage
  )[],
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
) {
  try {
    const chatResponse = await vscode.lm.sendChatRequest(
      LANGUAGE_MODEL_ID,
      messages,
      {},
      token
    );
    for await (const fragement of chatResponse.stream) {
      stream.markdown(fragement);
    }
  } catch (err) {
    if (err instanceof vscode.LanguageModelError) {
      console.log(err.message, err.code, err.stack);
    } else {
      console.log(err);
    }
  }
}

export function deactivate() {}
