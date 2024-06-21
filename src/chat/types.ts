export interface LLMConfig {
    model: string;
    provider: AiProvider
}

export type AiProvider = "Ollama"|"GitHub Copilot";