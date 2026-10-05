"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Shield, LayoutDashboard, Users, ScrollText, LogOut } from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/shared-with-me", label: "Shared With Me", icon: Users },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText },
];

export default function Navbar() {
  const { username, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  if (!isAuthenticated) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
          <Shield className="h-5 w-5 text-indigo-400" />
          <span className="text-lg tracking-tight">SecureShare</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === href
                  ? "bg-indigo-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* User + Logout */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            Logged in as{" "}
            <span className="font-semibold text-white">{username}</span>
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-300 transition hover:border-red-500 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
