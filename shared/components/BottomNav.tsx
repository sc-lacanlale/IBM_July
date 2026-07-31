"use client";

import Link from "next/link";

export interface NavItem {
  href: string;
  label: string;
  iconSrc: string;
  active?: boolean;
}

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 bg-white"
      aria-label="Main navigation"
      style={{
        height: "calc(var(--nav-h) + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <ul className="flex h-[var(--nav-h)] items-start justify-around px-2 pt-3">
        {items.map((item) => (
          <li key={item.href} className="flex flex-1 flex-col items-center">
            <Link
              href={item.href}
              className={`flex min-h-touch min-w-[88px] flex-col items-center gap-1 rounded-[20px] px-3 py-1 ${
                item.active ? "bg-tanaw-yellow" : ""
              }`}
              aria-current={item.active ? "page" : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.iconSrc}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
              <span className="font-display text-base text-black">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
