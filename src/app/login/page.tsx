"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogInIcon, SparklesIcon } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "登录服务暂时不可用，请稍后重试");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-brand"><span className="brand-mark flex size-10 items-center justify-center rounded-md"><SparklesIcon className="size-5" /></span><span>MOTILAI</span></div>
        <div className="auth-heading"><p className="auth-eyebrow">AI 工作台</p><h1>登录账号</h1><p>继续你的智能对话工作。</p></div>
        <form className="auth-form" onSubmit={submit}>
          <label><span>用户名或邮箱</span><input required value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" placeholder="输入用户名或邮箱" /></label>
          <label><span>密码</span><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="输入登录密码" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={loading} type="submit"><LogInIcon className="size-4" />{loading ? "登录中..." : "登录"}</button>
        </form>
        <p className="auth-switch">还没有账号？ <Link href="/register">创建账号</Link></p>
      </section>
    </main>
  );
}
