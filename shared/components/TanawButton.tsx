"use client";

import type { ButtonHTMLAttributes } from "react";

interface TanawButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "dark" | "ghost";
}

export function TanawButton({
  variant = "dark",
  className = "",
  children,
  ...rest
}: TanawButtonProps) {
  const base =
    "inline-flex min-h-touch items-center justify-center gap-2 rounded-full px-6 font-body text-lg transition active:scale-[0.98] disabled:opacity-50";
  const variants = {
    primary: "bg-tanaw-yellow text-black",
    dark: "bg-black text-white",
    ghost: "bg-transparent text-black border-2 border-black",
  };
  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
