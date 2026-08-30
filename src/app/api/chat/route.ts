import { createOpenAI } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/ai-sdk";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  streamText,
  convertToModelMessages,
  type UIMessage,
  type JSONSchema7,
  type ModelMessage,
} from "ai";
import { getCurrentUser } from "@/lib/auth";
import { getActiveProvider, getProvider } from "@/lib/model-providers";
import { listAssistantResources } from "@/lib/assistant-resources";

export const maxDuration = 60;

const defaultSystem = `你是 MOTILAI 的 AI 助手。请使用用户使用的语言作答，默认使用简体中文。
回答应准确、直接且结构清晰。用户消息中的 :agent[...]、:knowledge[...] 和 :tool[...] 是 @ 提及指令，
请将它们分别理解为指定助手、知识库和工具的上下文提示。对于附件，只根据实际可读取的内容回答，
无法读取时应明确说明，不要编造文件内容。`;

export async function POST(req: Request) {
  if (!(await getCurrentUser())) {
    return new Response("Unauthorized", { status: 401 });
  }
  const {
    messages,
    system,
    tools,
    providerId,
    model,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
    providerId?: string;
    model?: string;
  } = await req.json();

  const configuredProvider = providerId?.trim()
    ? await getProvider(providerId.trim())
    : await getActiveProvider();
  if (providerId?.trim() && (!configuredProvider || !configuredProvider.enabled)) {
    return new Response("所选模型供应商不可用，请刷新页面后重试。", { status: 400 });
  }
  const apiKey = configuredProvider?.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return createDemoResponse(messages);
  }

  const provider = createOpenAI({
    apiKey,
    ...((configuredProvider?.baseUrl || process.env.OPENAI_BASE_URL)
      ? { baseURL: configuredProvider?.baseUrl || process.env.OPENAI_BASE_URL }
      : {}),
    ...(configuredProvider?.settings.topK != null ? { fetch: createTopKFetch(configuredProvider.settings.topK) } : {}),
  });

  const resourceContext = await buildResourceContext(messages);
  const settings = configuredProvider?.settings;
  const modelMessages = await convertToModelMessages(messages);
  const callOptions = {
    model: provider.chat(model?.trim() || configuredProvider?.model || process.env.OPENAI_MODEL || "gpt-4.1-mini"),
    messages: settings?.supportsVision === false ? removeImageParts(modelMessages) : modelMessages,
    ...(settings?.supportsTools === false ? {} : { tools: { ...frontendTools(tools ?? {}) } }),
    system: [system ?? defaultSystem, resourceContext].filter(Boolean).join("\n\n"),
    ...(settings?.temperature != null ? { temperature: settings.temperature } : {}),
    ...(settings?.topP != null ? { topP: settings.topP } : {}),
    ...(settings?.maxOutputTokens != null ? { maxOutputTokens: settings.maxOutputTokens } : {}),
    ...(settings?.frequencyPenalty != null ? { frequencyPenalty: settings.frequencyPenalty } : {}),
    ...(settings?.presencePenalty != null ? { presencePenalty: settings.presencePenalty } : {}),
    ...(settings?.stopSequences.length ? { stopSequences: settings.stopSequences } : {}),
    ...(settings?.seed != null ? { seed: settings.seed } : {}),
    maxRetries: settings?.maxRetries ?? 2,
    timeout: settings?.requestTimeoutMs ?? 60000,
  };

  if (settings?.streaming === false) {
    try {
      const result = await generateText(callOptions);
      return createTextResponse(result.text);
    } catch (error) {
      console.error("Chat model error", error);
      return new Response("模型服务暂时不可用，请检查服务配置后重试。", { status: 502 });
    }
  }

  const result = streamText(callOptions);

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("Chat model error", error);
      return "模型服务暂时不可用，请检查服务配置后重试。";
    },
  });
}

function removeImageParts(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((message) => {
    if (message.role !== "user" || typeof message.content === "string") return message;
    const content = message.content.filter((part) => part.type !== "image" && !(part.type === "file" && part.mediaType.startsWith("image")));
    return { ...message, content: content.length > 0 ? content : [{ type: "text", text: "[已忽略图片附件：当前模型未启用视觉能力]" }] };
  });
}

function createTopKFetch(topK: number): typeof fetch {
  return async (input, init) => {
    if (typeof init?.body === "string") {
      try {
        const body = JSON.parse(init.body) as Record<string, unknown>;
        return fetch(input, { ...init, body: JSON.stringify({ ...body, top_k: topK }) });
      } catch {
        // Keep the original request when a provider uses a non-standard JSON body.
      }
    }
    return fetch(input, init);
  };
}

function createTextResponse(text: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const textId = crypto.randomUUID();
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: text });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

async function buildResourceContext(messages: UIMessage[]) {
  const mentions = new Map<string, Set<string>>();
  const directivePattern = /:([\w-]{1,64})\[([^\]\n]{1,1024})\](?:\{name=([^}\n]{1,1024})\})?/gu;
  for (const message of messages) {
    if (message.role !== "user") continue;
    for (const part of message.parts) {
      if (part.type !== "text") continue;
      for (const match of part.text.matchAll(directivePattern)) {
        const kind = match[1];
        if (kind !== "agent" && kind !== "knowledge" && kind !== "tool") continue;
        const id = match[3] ?? match[2];
        const ids = mentions.get(kind) ?? new Set<string>();
        ids.add(id);
        mentions.set(kind, ids);
      }
    }
  }
  if (mentions.size === 0) return "";

  const resources = await listAssistantResources({ enabledOnly: true });
  const sections: string[] = [];
  for (const kind of ["agent", "knowledge", "tool"] as const) {
    const ids = mentions.get(kind);
    if (!ids) continue;
    for (const resource of resources.filter((item) => item.kind === kind && ids.has(item.id))) {
      const config = resource.config;
      if (kind === "agent" && typeof config.prompt === "string" && config.prompt.trim()) {
        sections.push(`【助手：${resource.name}】\n${config.prompt.trim()}`);
      } else if (kind === "knowledge" && typeof config.content === "string" && config.content.trim()) {
        sections.push(`【知识库：${resource.name}】\n${config.content.trim().slice(0, 12000)}`);
      } else if (kind === "tool") {
        const parameters = config.parameters && typeof config.parameters === "object" ? JSON.stringify(config.parameters) : "{}";
        const endpoint = typeof config.endpoint === "string" ? config.endpoint : "";
        sections.push(`【工具：${resource.name}】\n参数：${parameters}${endpoint ? `\n执行端点：${endpoint}` : ""}`);
      }
    }
  }
  return sections.length > 0
    ? `以下是用户通过 @ 选择的后台资源上下文，请遵循其内容；工具仅作为定义参考，未经系统提供的工具调用能力不要虚构执行结果。\n\n${sections.join("\n\n")}`
    : "";
}

function createDemoResponse(messages: UIMessage[]) {
  const lastMessage = messages.at(-1);
  const text =
    lastMessage?.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n") ?? "";
  const files =
    lastMessage?.parts
      .filter((part) => part.type === "file")
      .map((part) => part.filename ?? "未命名文件") ?? [];

  const response = [
    "当前运行在演示模式，聊天界面的完整交互已经可用。",
    text ? `\n我收到了你的消息：\n\n> ${text.replaceAll("\n", "\n> ")}` : "",
    files.length > 0
      ? `\n已接收附件：${files.map((name) => `\`${name}\``).join("、")}。`
      : "",
    "\n配置 `OPENAI_API_KEY` 后，消息、图片、文件和 @ 指令会发送给实际模型处理。",
  ].join("");

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const textId = crypto.randomUUID();
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: textId });

      for (const chunk of response.match(/[\s\S]{1,12}/g) ?? []) {
        writer.write({ type: "text-delta", id: textId, delta: chunk });
        await new Promise((resolve) => setTimeout(resolve, 18));
      }

      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
