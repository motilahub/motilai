"use client";

import {
  AssistantRuntimeProvider,
  WebSpeechDictationAdapter,
  type AssistantRuntime,
} from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { createAttachmentAdapter } from "@/lib/attachment-adapter";
import type { User } from "@/lib/auth";
import {
  ChevronDownIcon,
  LogOutIcon,
  MessageSquareIcon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  SparklesIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type AssistantProps = {
  hasModel: boolean;
  modelName: string;
  providers: Array<{
    id: string;
    name: string;
    model: string;
    models: string[];
  }>;
  user: Omit<User, "passwordHash">;
  systemTitle: string;
  logoUrl: string;
};

const suggestions = [
  {
    title: "总结资料",
    label: "提炼重点和行动项",
    prompt: "请总结我接下来上传的资料，并提炼关键结论和行动项。",
  },
  {
    title: "分析图片",
    label: "识别内容并给出结论",
    prompt: "请分析我接下来上传的图片，描述重要信息并给出结论。",
  },
  {
    title: "制定计划",
    label: "拆解目标和下一步",
    prompt: "帮我把目标拆解成清晰、可执行的计划。",
  },
] as const;

export const Assistant = ({ hasModel, modelName, providers, user, systemTitle, logoUrl }: AssistantProps) => {
  const initialProvider = providers[0];
  const [selectedProviderId, setSelectedProviderId] = useState(initialProvider?.id ?? "");
  const [selectedModel, setSelectedModel] = useState(initialProvider?.models[0] || initialProvider?.model || modelName);
  const [selectedAgent, setSelectedAgent] = useState<{ id: string; label: string } | null>(null);
  useEffect(() => { if (systemTitle) document.title = systemTitle; }, [systemTitle]);
  const transport = useMemo(
    () => new AssistantChatTransport({
      api: "/api/chat",
      body: { providerId: selectedProviderId || undefined, model: selectedModel || undefined },
    }),
    [selectedModel, selectedProviderId],
  );
  const dictation = useMemo(
    () =>
      new WebSpeechDictationAdapter({
        language: "zh-CN",
        continuous: true,
        interimResults: true,
      }),
    [],
  );
  const attachments = useMemo(() => createAttachmentAdapter(), []);
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport,
    adapters: { dictation, attachments },
    suggestions,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatWorkspace
        runtime={runtime}
        hasModel={hasModel}
        providers={providers}
        selectedProviderId={selectedProviderId}
        selectedModel={selectedModel}
        selectedAgent={selectedAgent}
        onModelChange={(providerId, model) => { setSelectedProviderId(providerId); setSelectedModel(model); }}
        onAgentChange={setSelectedAgent}
        user={user}
        systemTitle={systemTitle}
        logoUrl={logoUrl}
      />
    </AssistantRuntimeProvider>
  );
};

const ChatWorkspace = ({
  runtime,
  hasModel,
  providers,
  selectedProviderId,
  selectedModel,
  selectedAgent,
  onModelChange,
  onAgentChange,
  user,
  systemTitle,
  logoUrl,
}: Omit<AssistantProps, "modelName"> & {
  runtime: AssistantRuntime;
  selectedProviderId: string;
  selectedModel: string;
  selectedAgent: { id: string; label: string } | null;
  onModelChange: (providerId: string, model: string) => void;
  onAgentChange: (agent: { id: string; label: string } | null) => void;
}) => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [profileMenuOpen]);

  const startNewChat = () => {
    runtime.thread.reset();
    setSidebarOpen(false);
  };

  return (
    <main className="app-shell h-dvh overflow-hidden">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="关闭侧边栏"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-[width,transform] md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarCollapsed ? "md:w-[4.5rem]" : "md:w-64"}`}
      >
        <div className={`flex h-16 items-center border-b px-4 ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
          {user.role === "admin" ? <Link href="/admin/users" className="brand-mark flex size-9 items-center justify-center overflow-hidden rounded-md" aria-label="进入后台管理">{logoUrl ? <img src={logoUrl} alt="" /> : <SparklesIcon className="size-4" />}</Link> : <div className="brand-mark flex size-9 items-center justify-center overflow-hidden rounded-md">{logoUrl ? <img src={logoUrl} alt="" /> : <SparklesIcon className="size-4" />}</div>}
          {!sidebarCollapsed && <div className="min-w-0">
            <div className="brand-name truncate text-sm font-semibold">
              {systemTitle || "MOTILAI"}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              AI 工作台
            </div>
          </div>}
        </div>

        <div className="p-3">
          <button
            type="button"
            aria-label="新对话"
            className={`new-chat-button flex h-10 w-full items-center rounded-md text-sm font-medium ${sidebarCollapsed ? "justify-center px-0" : "gap-2 px-3"}`}
            onClick={startNewChat}
          >
            <PlusIcon className="size-4" />
            {!sidebarCollapsed && "新对话"}
          </button>
        </div>

        <nav className="flex-1 px-3" aria-label="会话列表">
          {!sidebarCollapsed && <div className="text-muted-foreground px-2 pb-2 text-xs font-medium">最近</div>}
          <button
            type="button"
            aria-label="当前对话"
            className={`current-thread flex h-10 w-full items-center rounded-md text-left text-sm ${sidebarCollapsed ? "justify-center px-0" : "gap-2 px-3"}`}
          >
            <MessageSquareIcon className="size-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">当前对话</span>}
          </button>
        </nav>

        <div className={`border-t p-3 ${sidebarCollapsed ? "flex flex-col items-center gap-3" : "space-y-3"}`}>
          <div className={`flex items-center gap-2 text-xs ${sidebarCollapsed ? "justify-center" : ""}`}>
            <span
              className={`size-2 rounded-full ${hasModel ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            {!sidebarCollapsed && <span className="text-muted-foreground truncate">
              {hasModel ? "模型服务已连接" : "演示模式"}
            </span>}
          </div>
          <div ref={profileMenuRef} className="profile-menu-anchor w-full">
            <button
              type="button"
              className={`user-summary user-summary-trigger ${sidebarCollapsed ? "justify-center" : ""}`}
              aria-label={`打开用户菜单 ${user.username}`}
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen((value) => !value)}
            >
              <span className="user-avatar">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.username.slice(0, 1).toUpperCase()}
              </span>
              {!sidebarCollapsed && (
                <span className="min-w-0 flex-1 text-left">
                  <strong className="block truncate text-xs">{user.username}</strong>
                  <span className="text-muted-foreground block truncate text-[11px]">{user.role === "admin" ? "管理员" : "普通用户"}</span>
                </span>
              )}
              {!sidebarCollapsed && <ChevronDownIcon className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />}
            </button>

            {profileMenuOpen && (
              <div
                className={`profile-menu ${sidebarCollapsed ? "profile-menu-collapsed" : "profile-menu-expanded"}`}
                role="menu"
                aria-label="用户菜单"
              >
                {user.role === "admin" && (
                  <Link
                    href="/admin/settings"
                    className="sidebar-link profile-menu-item"
                    role="menuitem"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <SlidersHorizontalIcon className="size-3.5" />
                    配置管理
                  </Link>
                )}
                <button
                  type="button"
                  className="sidebar-link profile-menu-item w-full"
                  role="menuitem"
                  onClick={async () => {
                    setProfileMenuOpen(false);
                    await fetch("/api/auth/logout", { method: "POST" });
                    router.replace("/login");
                    router.refresh();
                  }}
                >
                  <LogOutIcon className="size-3.5" />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="app-header flex h-16 shrink-0 items-center justify-between border-b px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <TooltipIconButton
              tooltip={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
              variant="ghost"
              className="hidden md:inline-flex"
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              {sidebarCollapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
            </TooltipIconButton>
            <TooltipIconButton tooltip="打开侧边栏" variant="ghost" className="md:hidden" onClick={() => setSidebarOpen(true)}><PanelLeftIcon /></TooltipIconButton>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="user-avatar header-user-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.username.slice(0, 1).toUpperCase()}</div>
            <span className="header-username max-w-32 truncate text-xs font-medium">{user.username}</span>
            <div className="status-pill flex items-center gap-2 rounded-full px-2.5 py-1 text-xs">
            <span
              className={`size-1.5 rounded-full ${hasModel ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            {hasModel ? "在线" : "Demo"}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <Thread
            providers={providers}
            selectedProviderId={selectedProviderId}
            selectedModel={selectedModel}
            selectedAgent={selectedAgent}
            onModelChange={onModelChange}
            onAgentChange={onAgentChange}
          />
        </div>
      </section>
    </main>
  );
};
