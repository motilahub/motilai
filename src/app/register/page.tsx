"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, SparklesIcon } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("两次输入的密码不一致");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "注册服务暂时不可用，请稍后重试");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell"><section className="auth-panel">
      <div className="auth-brand"><span className="brand-mark flex size-10 items-center justify-center rounded-md"><SparklesIcon className="size-5" /></span><span>MOTILAI</span></div>
      <div className="auth-heading"><p className="auth-eyebrow">开始使用</p><h1>创建账号</h1><p>注册后即可使用聊天工作台。</p></div>
      <form className="auth-form" onSubmit={submit}>
        <label><span>用户名</span><input required minLength={3} maxLength={24} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} autoComplete="username" placeholder="设置用户名" /></label>
        <label><span>邮箱</span><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" placeholder="输入常用邮箱" /></label>
        <label><span>密码</span><input required minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" placeholder="至少 8 位字符" /></label>
        <label><span>确认密码</span><input required minLength={8} type="password" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} autoComplete="new-password" placeholder="再次输入密码" /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="auth-submit" disabled={loading} type="submit"><ArrowRightIcon className="size-4" />{loading ? "创建中..." : "创建账号"}</button>
      </form>
      <p className="auth-switch">已有账号？ <Link href="/login">返回登录</Link></p>
    </section></main>
  );
}
