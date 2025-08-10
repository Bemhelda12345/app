"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  // Removed Reports from sidebar as per user request
  { label: "Manage User", href: "/manage-user" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
      <div className="mb-8 text-center">
        <span className="text-cyan-400 font-bold text-xl uppercase tracking-wide">
          CENTRAL
        </span>
        <br />
        <span className="text-cyan-400 font-bold text-xl uppercase tracking-wide">
          MONITORING
        </span>
      </div>
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-4 py-3 transition-colors font-medium ${
                isActive 
                  ? "bg-sems-primary text-white font-semibold" 
                  : "text-white/90 hover:bg-sems-primary/20 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={() => signOut()}
        className="mt-auto rounded-md bg-sems-primary px-4 py-2 text-white hover:bg-sems-primary/90 transition-colors"
        type="button"
      >
        Logout
      </button>
    </aside>
  );
}
