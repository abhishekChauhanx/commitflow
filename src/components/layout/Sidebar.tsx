"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  GitCommit,
  CalendarPlus,
  History,
  User,
} from "lucide-react";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Commits", href: "/dashboard/commits", icon: GitCommit },
  { label: "Custom Commit", href: "/dashboard/custom", icon: CalendarPlus },
  { label: "History", href: "/dashboard/history", icon: History },
  { label: "Profile", href: "/dashboard/profile", icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen border-r border-gray-800 bg-gray-950 p-4 hidden md:flex flex-col">
      <div className="text-xl font-bold px-2 py-4">CommitFlow</div>
      <nav className="flex flex-col gap-1 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}