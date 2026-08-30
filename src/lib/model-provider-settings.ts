export type ModelProviderSettings = {
  temperature: number | null;
  topP: number | null;
  topK: number | null;
  maxOutputTokens: number | null;
  frequencyPenalty: number | null;
  presencePenalty: number | null;
  stopSequences: string[];
  seed: number | null;
  streaming: boolean;
  requestTimeoutMs: number;
  maxRetries: number;
  contextWindow: number | null;
  supportsVision: boolean;
  supportsTools: boolean;
};

export const DEFAULT_MODEL_PROVIDER_SETTINGS: ModelProviderSettings = {
  temperature: null,
  topP: null,
  topK: null,
  maxOutputTokens: null,
  frequencyPenalty: null,
  presencePenalty: null,
  stopSequences: [],
  seed: null,
  streaming: true,
  requestTimeoutMs: 60000,
  maxRetries: 2,
  contextWindow: null,
  supportsVision: true,
  supportsTools: true,
};

const numericRules = {
  temperature: { min: 0, max: 2, integer: false, label: "温度" },
  topP: { min: 0, max: 1, integer: false, label: "Top P" },
  topK: { min: 1, max: 1000, integer: true, label: "Top K" },
  maxOutputTokens: { min: 1, max: 131072, integer: true, label: "最大输出 Token" },
  frequencyPenalty: { min: -2, max: 2, integer: false, label: "频率惩罚" },
  presencePenalty: { min: -2, max: 2, integer: false, label: "存在惩罚" },
  seed: { min: 0, max: 2147483647, integer: true, label: "随机种子" },
  requestTimeoutMs: { min: 5000, max: 300000, integer: true, label: "请求超时" },
  maxRetries: { min: 0, max: 5, integer: true, label: "最大重试次数" },
  contextWindow: { min: 1024, max: 10000000, integer: true, label: "上下文窗口" },
} as const;

function optionalNumber(value: unknown, key: keyof typeof numericRules, fallback: number | null) {
  if (value === undefined) return fallback;
  if (value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${numericRules[key].label}必须是有效数字`);
  const rule = numericRules[key];
  if (value < rule.min || value > rule.max || (rule.integer && !Number.isInteger(value))) {
    throw new Error(`${rule.label}必须在 ${rule.min} 到 ${rule.max} 之间${rule.integer ? "且为整数" : ""}`);
  }
  return value;
}

export function normalizeModelProviderSettings(value: unknown): ModelProviderSettings {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const stopSequences = input.stopSequences === undefined
    ? DEFAULT_MODEL_PROVIDER_SETTINGS.stopSequences
    : Array.isArray(input.stopSequences)
      ? [...new Set(input.stopSequences.map((item) => String(item).trim()).filter(Boolean))]
      : (() => { throw new Error("停止词必须是数组"); })();
  if (stopSequences.length > 8 || stopSequences.some((item) => item.length > 100)) throw new Error("停止词最多 8 个，每个不超过 100 个字符");

  return {
    temperature: optionalNumber(input.temperature, "temperature", DEFAULT_MODEL_PROVIDER_SETTINGS.temperature),
    topP: optionalNumber(input.topP, "topP", DEFAULT_MODEL_PROVIDER_SETTINGS.topP),
    topK: optionalNumber(input.topK, "topK", DEFAULT_MODEL_PROVIDER_SETTINGS.topK),
    maxOutputTokens: optionalNumber(input.maxOutputTokens, "maxOutputTokens", DEFAULT_MODEL_PROVIDER_SETTINGS.maxOutputTokens),
    frequencyPenalty: optionalNumber(input.frequencyPenalty, "frequencyPenalty", DEFAULT_MODEL_PROVIDER_SETTINGS.frequencyPenalty),
    presencePenalty: optionalNumber(input.presencePenalty, "presencePenalty", DEFAULT_MODEL_PROVIDER_SETTINGS.presencePenalty),
    stopSequences,
    seed: optionalNumber(input.seed, "seed", DEFAULT_MODEL_PROVIDER_SETTINGS.seed),
    streaming: typeof input.streaming === "boolean" ? input.streaming : DEFAULT_MODEL_PROVIDER_SETTINGS.streaming,
    requestTimeoutMs: optionalNumber(input.requestTimeoutMs, "requestTimeoutMs", DEFAULT_MODEL_PROVIDER_SETTINGS.requestTimeoutMs) ?? DEFAULT_MODEL_PROVIDER_SETTINGS.requestTimeoutMs,
    maxRetries: optionalNumber(input.maxRetries, "maxRetries", DEFAULT_MODEL_PROVIDER_SETTINGS.maxRetries) ?? DEFAULT_MODEL_PROVIDER_SETTINGS.maxRetries,
    contextWindow: optionalNumber(input.contextWindow, "contextWindow", DEFAULT_MODEL_PROVIDER_SETTINGS.contextWindow),
    supportsVision: typeof input.supportsVision === "boolean" ? input.supportsVision : DEFAULT_MODEL_PROVIDER_SETTINGS.supportsVision,
    supportsTools: typeof input.supportsTools === "boolean" ? input.supportsTools : DEFAULT_MODEL_PROVIDER_SETTINGS.supportsTools,
  };
}
