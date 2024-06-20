import * as vscode from "vscode";
import ollama from "ollama";
import {
  CancellationToken,
  LanguageModelChatMessage,
  LanguageModelChatRequestOptions,
  LanguageModelChatResponse,
} from "vscode";

export async function chatRequest(
  model: string,
  messages: LanguageModelChatMessage[],
  options: LanguageModelChatRequestOptions,
  token?: CancellationToken
): Promise<Thenable<LanguageModelChatResponse>> {
  const models = await vscode.lm.selectChatModels({ family: model });
  if (models.length > 0) {
    const [first] = models;
    const response = await first.sendRequest(messages, options, token);
    return response;
  }

  return ollamaRequest(model, messages);
}

async function ollamaRequest(
  modelID: string,
  messages: LanguageModelChatMessage[]
): Promise<LanguageModelChatResponse> {
  const chats = [];
  for (const message of messages) {
    chats.push({
      role: "user",
      content: message.content,
    });
  }
  const response = await ollama.chat({
    model: modelID,
    messages: chats,
  });
  console.log(response.message.content);

  return {
    text: {
      [Symbol.asyncIterator]: async function* () {
        yield response.message.content;
      },
    },
  };
}
