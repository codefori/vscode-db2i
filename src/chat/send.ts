import fetch from "node-fetch";
import * as vscode from "vscode";
import ollama from "ollama";
import {
  CancellationToken,
  LanguageModelChatMessage,
  LanguageModelChatRequestOptions,
  LanguageModelChatResponse,
} from "vscode";
import { AiConfig, AiProvider } from "./aiConfig";
import { getWatsonXAccessToken } from "./watsonX";

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
    case "WatsonX":
      return watsonXRequest(chosenModel, messages, stream);
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

export async function watsonXRequest(
  model: string,
  messages: LanguageModelChatMessage[],
  stream: vscode.ChatResponseStream
) {
	const url = "https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29";
  const accessToken = await getWatsonXAccessToken();
	const headers = {
		"Accept": "application/json",
		"Content-Type": "application/json",
		"Authorization": `Bearer ${accessToken}`
	};
  let inputBody: string[] = [];

  for (const message of messages) {
    const roleLabel = message.role === 1 ? "user" : "assistant";
    inputBody.push(`<|${roleLabel}|>\n${message.content}\n`);
  }

  inputBody.push(`<|assistant|>\n`);

	const body = {
		// input: "<|system|>\nYou are Granite Chat, an AI language model developed by IBM. You are a cautious assistant. You carefully follow instructions. You are helpful and harmless and you follow ethical guidelines and promote positive behavior. You always respond to greetings (for example, hi, hello, g'\''day, morning, afternoon, evening, night, what'\''s up, nice to meet you, sup, etc) with \"Hello! I am Granite Chat, created by IBM. How can I help you today?\". Please do not say anything else and do not start a conversation.\n<|user|>\n${userInput}\n<|assistant|>\n",
    input: inputBody.join(""),
		parameters: {
			decoding_method: "greedy",
			max_new_tokens: 900,
			min_new_tokens: 0,
			stop_sequences: [],
			repetition_penalty: 1.05
		},
		model_id: model,
		project_id: "790743a6-e2cc-40ee-b587-03fe9c87358c"
	};

	const response = await fetch(url, {
		headers,
		method: "POST",
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		throw new Error(`Failed to get response from WatsonX. (${response.status})`);
	}

  const asJson = await response.json() as any;

  if (asJson.results && Array.isArray(asJson.results)) {
    for (const result of asJson.results) {
      stream.markdown(result.generated_text);
    }
  }
}