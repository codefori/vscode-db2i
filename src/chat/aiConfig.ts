import Configuration from "../configuration";

/**
 * Matches config vscode-db2i.ai.provider
 */
export type AiProvider = "none"|"Ollama"|"GitHub Copilot";

export class AiConfig {
  static getProvider(): AiProvider {
    return Configuration.get<AiProvider>(`ai.provider`);
  }

  static getModel(): string {
    return Configuration.get<string>("ai.model");
  }

  static setProvider(provider: AiProvider) {
    return Configuration.set(`ai.provider`, provider);
  }

  static setModel(model: string) {
    return Configuration.set(`ai.model`, model);
  }
}