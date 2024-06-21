import Configuration from "../configuration";
import { Config } from '../config';
import * as vscode from 'vscode';
import { stat } from 'fs/promises';
import ollama, { ListResponse } from "ollama";
import { AiProvider, LLMConfig } from "./types";


export class AiModelQuickPick implements vscode.QuickPickItem {
  label: string  // model title
  description?: string;  // model details
  detail?: string;   // ai provider

  constructor(object: LLMConfig) {
    this.label = object.model;
    this.description = object.provider;
  }
}

export async function getOllamaModels() {
  const ollamaModels: ListResponse = await ollama.list();
  const formattedModels: LLMConfig[] = ollamaModels.models.map((model) => {
    return {
      model: model.name, // Assuming 'id' is the correct property for the model identifier
      provider: "Ollama" as AiProvider,
    };
  });

  return formattedModels;
}

export class AiConfig {

  static getProvider(): AiProvider {
    return Configuration.get<AiProvider>(`ai.provider`);
  }

  static getModel(provider: AiProvider): string {
    switch (provider) {
      case "Ollama":
        return Configuration.get<string>("ai.ollama.model");
      case "GitHub Copilot":
        return Configuration.get<string>("ai.ghCopilot.model");
    }
  }
}