"use client";

import { BotIcon, ChevronLeftIcon, ChevronRightIcon, LayoutDashboardIcon, LogOutIcon, Settings2Icon, UsersIcon, SlidersHorizontalIcon, DatabaseIcon, WrenchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function AdminHeader({ menuTitle }: { menuTitle: string; currentUsername?: string; avatarUrl?: string }) {
  return <header className="admin-header"><div className="admin-header-title"><p className="auth-eyebrow">MOTILAI 管理后台</p><h1>{menuTitle}</h1></div></header>;
}

export function AdminShell({ currentUsername, avatarUrl, logoUrl, title, children }: { currentUsername: string; avatarUrl?: string; logoUrl?: string; title?: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!profileMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [profileMenuOpen]);
  const links = [
    { href: "/admin/users", label: "用户管理", icon: UsersIcon },
    { href: "/admin/providers", label: "模型供应商", icon: Settings2Icon },
    { href: "/admin/agents", label: "助手", icon: BotIcon },
    { href: "/admin/knowledge", label: "知识库", icon: DatabaseIcon },
    { href: "/admin/tools", label: "工具", icon: WrenchIcon },
    { href: "/admin/settings", label: "系统配置", icon: SlidersHorizontalIcon },
  ];
  return <main className="admin-app-shell"><aside className={`admin-sidebar ${collapsed ? "collapsed" : ""}`}><div className="admin-brand-bar"><Link href="/admin/users" className="admin-brand" aria-label="后台首页"><span className="brand-mark flex size-9 items-center justify-center overflow-hidden rounded-md">{logoUrl ? <img src={logoUrl} alt="" /> : <BotIcon className="size-4" />}</span>{!collapsed && <div><strong>{title || "MOTILAI"}</strong><small>管理后台</small></div>}</Link><button type="button" className="admin-collapse" aria-label={collapsed ? "展开菜单" : "收起菜单"} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRightIcon className="size-4" /> : <ChevronLeftIcon className="size-4" />}</button></div><nav className="admin-nav" aria-label="后台导航"><Link href="/" className="admin-nav-link"><LayoutDashboardIcon className="size-4" />{!collapsed && "CHAT"}</Link>{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`admin-nav-link ${pathname === href ? "active" : ""}`}><Icon className="size-4" />{!collapsed && label}</Link>)}</nav><div className="admin-sidebar-footer"><div ref={profileMenuRef} className="admin-profile-anchor"><button type="button" className={`admin-user-chip admin-user-trigger ${collapsed ? "justify-center" : ""}`} aria-label={`打开用户菜单 ${currentUsername}`} aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((value) => !value)}><span className="user-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : currentUsername.slice(0, 1).toUpperCase()}</span>{!collapsed && <span className="truncate">{currentUsername}</span>}</button>{profileMenuOpen && <div className={`profile-menu ${collapsed ? "profile-menu-collapsed" : "profile-menu-expanded"}`} role="menu" aria-label="用户菜单"><button type="button" className="sidebar-link profile-menu-item w-full" role="menuitem" onClick={async () => { setProfileMenuOpen(false); await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); }}><LogOutIcon className="size-3.5" />退出登录</button></div>}</div></div></aside><section className="admin-main">{children}</section></main>;
}
