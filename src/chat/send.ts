import { LanguageModelChatUserMessage, LanguageModelChatSystemMessage, LanguageModelChatRequestOptions, CancellationToken, LanguageModelChatResponse, lm } from "vscode";
import ollama from 'ollama'

export type GptMessage = (
  | LanguageModelChatUserMessage
  | LanguageModelChatSystemMessage
);

export function chatRequest(model: string, messages: GptMessage[], options: LanguageModelChatRequestOptions, token?: CancellationToken): Thenable<LanguageModelChatResponse> {
  if (lm.languageModels.includes(model)) {
    return lm.sendChatRequest(model, messages, options, token);
  }

  return ollamaRequest(model, messages);
}

async function ollamaRequest(model: string, messages: GptMessage[]): Promise<LanguageModelChatResponse> {
  const response = await ollama.chat({
    model,
    messages: messages.map((copilotMessage, i) => {
      const role = i === messages.length - 1 ? 'user' : 'system'; // We assume the last message is the user message
      return {
        role,
        content: copilotMessage.content
      }
    }),
    stream: true
  });

  return {
    stream: {
      [Symbol.asyncIterator]: async function* () {
        for await (const part of response) {
          yield part.message.content;
        }
      }
    },    
    text: {
      [Symbol.asyncIterator]: async function* () {
        let text = '';
        for await (const part of response) {
          text += part.message.content;
        }
        return text;
      }
    },
  }
}