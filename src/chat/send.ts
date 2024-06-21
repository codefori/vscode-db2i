import * as vscode from "vscode";
import ollama from "ollama";
import {
  CancellationToken,
  LanguageModelChatMessage,
  LanguageModelChatRequestOptions,
  LanguageModelChatResponse,
} from "vscode";
import Configuration from "../configuration";
import { AiConfig } from "./aiConfig";
import { AiProvider } from "./types";

export async function chatRequest(
  provider: AiProvider,
  messages: LanguageModelChatMessage[],
  options: LanguageModelChatRequestOptions,
  token?: CancellationToken
): Promise<Thenable<LanguageModelChatResponse>> {
  const chosenModel = AiConfig.getModel();

  switch (provider) {
    case "Ollama":
      return ollamaRequest(chosenModel, messages);
    case "GitHub Copilot":
      return copilotRequest(chosenModel, messages, options, token);
  }
}

async function copilotRequest(
  model: string,
  messages: LanguageModelChatMessage[],
  options: LanguageModelChatRequestOptions,
  token?: CancellationToken
): Promise<LanguageModelChatResponse> {
  const models = await vscode.lm.selectChatModels({ family: model });
  if (models.length > 0) {
    const [first] = models;
    const response = await first.sendRequest(messages, options, token);
    return response;
  }
}

async function ollamaRequest(
  model: string,
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
    model: model,
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
