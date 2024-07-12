import ollama, { ListResponse } from "ollama";
import { AiConfig, AiProvider } from "./aiConfig";
import { lm, window, QuickPickItemKind, ThemeIcon, QuickPickItem } from "vscode";
import { initWatsonX, WATSONX_MODELS } from "./watsonX";

interface ModelQuickPickItem extends QuickPickItem {
  provider: AiProvider;
  family: string;
}

export async function selectProviderAndModel() {
  const selected = AiConfig.getModel();
  const copilotModels = await lm.selectChatModels();
  let ollamaModels: ListResponse = { models: [] };

  try {
    ollamaModels = await ollama.list();
  } catch (e) { }

  const provider = await window.showQuickPick(
    [
      { kind: QuickPickItemKind.Separator, label: "Ollama Models" },
      ...ollamaModels.models.map(
        (model): ModelQuickPickItem => ({
          label: model.name,
          family: model.name,
          provider: "Ollama",
          iconPath: new ThemeIcon("heart"),
          description: selected === model.name ? "Selected" : "",
        })
      ),
      {
        kind: QuickPickItemKind.Separator,
        label: "GitHub Copilot Models",
      },
      ...copilotModels.map(
        (model): ModelQuickPickItem => ({
          label: model.name,
          family: model.family,
          provider: "GitHub Copilot",
          iconPath: new ThemeIcon("copilot"),
          description: selected === model.family ? "Selected" : "",
        })
      ),

      { kind: QuickPickItemKind.Separator, label: "WatsonX Models" },
      ...WATSONX_MODELS.map(model => ({
        label: model,
        family: model,
        provider: "WatsonX",
        iconPath: new ThemeIcon("globe"),
        description: selected === model ? "Selected" : "",
      } as ModelQuickPickItem)
      )
    ],
    {
      title: "Select the AI model",
    }
  );

  if (provider && "provider" in provider && "family" in provider) {
    if (provider.provider === `WatsonX`) {
      const watsonXIsValid = await initWatsonX(true);
      if (!watsonXIsValid) {
        window.showWarningMessage(`WatsonX is not available. Please check your credentials. Selected proivder and model not changed.`);
        return;
      }
    }

    AiConfig.setProvider(provider.provider);
    AiConfig.setModel(provider.family);
  }
}
