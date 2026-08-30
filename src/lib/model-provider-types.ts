export const MODEL_PROVIDER_TYPES = [
  { value: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { value: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  { value: "ollama", label: "Ollama", baseUrl: "http://localhost:11434/v1" },
  { value: "siliconflow", label: "SiliconFlow", baseUrl: "https://api.siliconflow.cn/v1" },
  { value: "qwen", label: "通义千问 / DashScope", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { value: "zhipu", label: "智谱 GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4" },
  { value: "moonshot", label: "Moonshot", baseUrl: "https://api.moonshot.cn/v1" },
  { value: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
  { value: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { value: "xai", label: "xAI", baseUrl: "https://api.x.ai/v1" },
  { value: "gemini", label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { value: "mistral", label: "Mistral AI", baseUrl: "https://api.mistral.ai/v1" },
  { value: "together", label: "Together AI", baseUrl: "https://api.together.xyz/v1" },
  { value: "nvidia", label: "NVIDIA NIM", baseUrl: "https://integrate.api.nvidia.com/v1" },
  { value: "volcengine", label: "火山方舟", baseUrl: "https://ark.cn-beijing.volces.com/api/v3" },
  { value: "hunyuan", label: "腾讯混元", baseUrl: "https://api.hunyuan.cloud.tencent.com/v1" },
  { value: "qianfan", label: "百度千帆", baseUrl: "https://qianfan.baidubce.com/v2" },
  { value: "custom", label: "自定义", baseUrl: "" },
] as const;

export type ModelProviderType = (typeof MODEL_PROVIDER_TYPES)[number]["value"];

export function getProviderType(value: string | undefined) {
  return MODEL_PROVIDER_TYPES.find((item) => item.value === value)?.value ?? "custom";
}
