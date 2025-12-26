import React from "react";
import MetaIcon from "@/app/icons/meta.svg";
import MicrosoftIcon from "@/app/icons/microsoft.svg";
import MistralIcon from "@/app/icons/mistral.svg";
import GoogleIcon from "@/app/icons/google.svg";
import StablelmIcon from "@/app/icons/stablelm.svg";
// import DeepSeekIcon from "@/app/icons/deepseek.svg";
import { ModelRecord } from "../client/api";
import { ModelFamily } from "../constant";
import { Shirt } from "lucide-react";
// import { getSize } from "../utils";
import { prebuiltAppConfig } from "@mlc-ai/web-llm";

/**
 * Derive size category from model parameter count or parsed size
 */
function getSizeCategory(
  parameter: number | undefined,
  size: string | undefined,
):
  | "Small (<3B)"
  | "Standard (3-7B)"
  | "Medium (7-30B)"
  | "Large (30B+)"
  | undefined {
  // Use parameter field if available
  if (parameter !== undefined) {
    if (parameter < 3) return "Small (<3B)";
    if (parameter >= 3 && parameter < 7) return "Standard (3-7B)";
    if (parameter >= 7 && parameter < 30) return "Medium (7-30B)";
    return "Large (30B+)";
  }

  // Fallback to parsing size string
  if (!size) return undefined;

  const numericSize = parseFloat(size);
  const unit = size.toUpperCase().slice(-1);

  // Convert to billions for comparison
  const sizeInB = unit === "K" ? numericSize / 1000 : numericSize;

  if (sizeInB < 3) return "Small (<3B)";
  if (sizeInB >= 3 && sizeInB < 7) return "Standard (3-7B)";
  if (sizeInB >= 7 && sizeInB < 30) return "Medium (7-30B)";
  return "Large (30B+)";
}

/**
 * Extract base model name (without quantization and MLC suffix)
 */
export function getBaseModelName(modelName: string): string {
  // Remove quantization patterns like -q4f16_1, -q4f32_1, -q0f16, etc.
  // Also remove -MLC suffix and context window suffix like -1k
  return modelName
    .replace(/-q\d+f\d+(_\d+)?/i, "")
    .replace(/-MLC(-\d+k)?$/i, "");
}

/**
 * Extract quantization from model name
 */
export function getQuantization(modelName: string): string | undefined {
  const match = modelName.match(/-(q\d+f\d+(_\d+)?)/i);
  return match ? match[1] : undefined;
}

/**
 * Format model name for display
 * Removes MLC suffix, context window suffix, and formats parts appropriately
 */
export function formatModelName(modelName: string): string {
  // Remove "-MLC" suffix and context window suffix (e.g., "-1k")
  let formatted = modelName.replace(/-MLC(-\d+k)?$/i, "");

  // Replace hyphens with spaces and capitalize, but preserve quantization format
  formatted = formatted
    .split("-")
    .map((part) => {
      // Keep version numbers as-is (like 3.5, 3.1, etc)
      if (/^\d+(\.\d+)?$/.test(part)) return part;
      // Keep quantization patterns as-is, but remove trailing _1
      if (/^q\d+f\d+(_\d+)?$/i.test(part)) return part.replace(/_\d+$/, "");
      // Keep size indicators as-is (70B, 8B, 4B, etc)
      if (/^\d+[BK]$/i.test(part)) return part.toUpperCase();
      // Capitalize first letter for everything else (including "Instruct")
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");

  return formatted;
}

function formatParameterNumber(parameter: number): string {
  const formatted = Number.isInteger(parameter)
    ? parameter.toString()
    : parameter.toFixed(1).replace(/\.0$/, "");
  return `${formatted}B`;
}

/**
 * Format model parameter size for display.
 */
export function formatParameterSize(
  parameter?: number,
  size?: string,
): string | undefined {
  if (parameter !== undefined) {
    return `${formatParameterNumber(parameter)} params`;
  }

  if (!size) return undefined;

  const normalized = size.trim();
  if (!normalized) return undefined;

  return `${normalized.toUpperCase()} params`;
}

/**
 * Get friendly variant label based on quantization and context window
 */
export function getVariantLabel(
  modelName: string,
  contextWindow?: number,
): string {
  const quant = getQuantization(modelName);

  // Check if model has -1k suffix OR 1024 context window
  const hasLowResourceSuffix = modelName.includes("-1k");

  // Only consider it "Low Resource" if it has 1K context window
  if (hasLowResourceSuffix || contextWindow === 1024) {
    return "Low Resource";
  }

  if (quant?.includes("f32")) {
    return "High Precision";
  }

  return "Standard";
}

/**
 * Format VRAM in MB to human-readable GB string
 */
export function formatVRAM(vramMB?: number): string | undefined {
  if (!vramMB) return undefined;
  return `${(vramMB / 1024).toFixed(1)} GB`;
}

/**
 * Format context window size to human-readable string
 */
export function formatContextWindow(contextSize?: number): string | undefined {
  if (!contextSize) return undefined;

  if (contextSize >= 1024) {
    return `${(contextSize / 1024).toFixed(0)}K`;
  }

  return `${contextSize}`;
}

/**
 * Group models by base name
 */
export interface GroupedModel {
  baseName: string;
  displayName: string;
  models: ModelRecord[];
  // Shared properties from the first model in the group
  family: string;
  benchmark_score?: number;
  size_category?:
    | "Small (<3B)"
    | "Standard (3-7B)"
    | "Medium (7-30B)"
    | "Large (30B+)";
  file_size?: string;
}

export function groupModelsByBaseName(models: ModelRecord[]): GroupedModel[] {
  const groups = new Map<string, ModelRecord[]>();

  // Group models by base name
  models.forEach((model) => {
    const baseName = getBaseModelName(model.name);
    if (!groups.has(baseName)) {
      groups.set(baseName, []);
    }
    groups.get(baseName)!.push(model);
  });

  // Convert to GroupedModel array
  return Array.from(groups.entries()).map(([baseName, groupModels]) => {
    const firstModel = groupModels[0];
    return {
      baseName,
      displayName: firstModel.display_name,
      models: groupModels,
      family: firstModel.family,
      benchmark_score: firstModel.benchmark_score,
      size_category: firstModel.size_category,
      file_size: firstModel.file_size,
    };
  });
}

/**
 * Enrich model with metadata derived from the model record and WebLLM config
 */
export function enrichModelWithMetadata(model: ModelRecord): ModelRecord {
  const sizeCategory = getSizeCategory(model.parameter, model.size);

  // Try to find matching model in WebLLM prebuilt config
  const webllmModel = prebuiltAppConfig.model_list.find(
    (m) => m.model_id === model.name,
  );

  return {
    ...model,
    size_category: sizeCategory,
    // Merge WebLLM config data if available to get VRAM and context window
    vram_required_MB: model.vram_required_MB ?? webllmModel?.vram_required_MB,
    context_window_size:
      model.context_window_size ?? webllmModel?.overrides?.context_window_size,
  };
}

export function collectModelTable(
  models: readonly ModelRecord[],
  customModels: string,
) {
  const modelTable: Record<
    string,
    {
      name: string;
      display_name: string;
      provider?: ModelRecord["provider"]; // Marked as optional
      isDefault?: boolean;
    }
  > = {};

  // default models
  models.forEach((m) => {
    modelTable[m.name] = {
      ...m,
      display_name: m.name, // 'provider' is copied over if it exists
    };
  });

  // server custom models
  customModels
    .split(",")
    .filter((v) => !!v && v.length > 0)
    .forEach((m) => {
      const available = !m.startsWith("-");
      const nameConfig =
        m.startsWith("+") || m.startsWith("-") ? m.slice(1) : m;
      const [name, display_name] = nameConfig.split("=");

      modelTable[name] = {
        name,
        display_name: display_name || name,
        provider: modelTable[name]?.provider ?? "", // Use optional chaining
      };
    });

  return modelTable;
}

/**
 * Generate full model table.
 */
export function collectModels(
  models: readonly ModelRecord[],
  customModels: string,
) {
  const modelTable = collectModelTable(models, customModels);
  const allModels = Object.values(modelTable);

  return allModels;
}

export interface ModelDetails {
  family: ModelFamily;
  name: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export const modelDetailsList: ModelDetails[] = [
  { family: ModelFamily.LLAMA, name: "Llama", icon: MetaIcon },
  // { family: ModelFamily.DEEPSEEK, name: "DeepSeek", icon: DeepSeekIcon },
  {
    family: ModelFamily.QWEN,
    name: "Qwen",
    icon: (...props) => <img src="./qwen.webp" alt="Qwen Logo" {...props} />,
  },
  { family: ModelFamily.GEMMA, name: "Gemma", icon: GoogleIcon },
  { family: ModelFamily.PHI, name: "Phi", icon: MicrosoftIcon },
  { family: ModelFamily.MISTRAL, name: "Mistral", icon: MistralIcon },
  {
    family: ModelFamily.SMOL_LM,
    name: "SmolLM",
    icon: (...props) => <img src="./smollm.png" alt="SmolLM Logo" {...props} />,
  },
  { family: ModelFamily.STABLE_LM, name: "StableLM", icon: StablelmIcon },
  { family: ModelFamily.REDPAJAMA, name: "RedPajama", icon: Shirt },
  // { family: ModelFamily.WIZARD_MATH, name: "Wizard Math", icon: WandSparkles },
];
