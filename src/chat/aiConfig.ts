import Configuration from "../configuration";

export type AiProvider = "Ollama"|"GitHub Copilot";

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