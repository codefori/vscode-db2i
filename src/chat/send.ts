import * as vscode from "vscode";
import ollama from "ollama";
import {
  CancellationToken,
  LanguageModelChatMessage,
  LanguageModelChatRequestOptions,
  LanguageModelChatResponse,
} from "vscode";
import { AiConfig, AiProvider } from "./aiConfig";

export function chatRequest(
  provider: AiProvider,
  messages: LanguageModelChatMessage[],
  options: LanguageModelChatRequestOptions,
  token: CancellationToken,
  stream: vscode.ChatResponseStream
): Promise<void> {
  const chosenModel = AiConfig.getModel();

  switch (provider) {
    case "Ollama":
      return ollamaRequest(chosenModel, messages, stream);
    case "GitHub Copilot":
      return copilotRequest(chosenModel, messages, options, token, stream);
  }
}

async function copilotRequest(
  model: string,
  messages: LanguageModelChatMessage[],
  options: LanguageModelChatRequestOptions,
  token: CancellationToken,
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

async function ollamaRequest(
  model: string,
  messages: LanguageModelChatMessage[],
  stream: vscode.ChatResponseStream
): Promise<void> {
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

  for await (const fragment of response.message.content) {
    stream.markdown(fragment);
  }
}
