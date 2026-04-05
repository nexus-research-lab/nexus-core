"use client";

import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface WorkspacePillButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  children: ReactNode;
  variant?: "default" | "strong" | "success" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  density?: "default" | "compact";
  stretch?: boolean;
  /** 中文注释：这里只允许布局层补充外边距、显隐和定位，不再覆写颜色、圆角和阴影。 */
  class_name?: string;
}

export const WorkspacePillButton = forwardRef<HTMLButtonElement, WorkspacePillButtonProps>(
  function WorkspacePillButton({
    children,
    class_name,
    type = "button",
    variant = "default",
    size = "md",
    density = "default",
    stretch = false,
    ...props
  }: WorkspacePillButtonProps, ref) {
    return (
      <button
        className={cn(
          "chip-button disabled:cursor-not-allowed disabled:opacity-60",
          class_name,
        )}
        data-density={density}
        data-size={size}
        data-stretch={stretch}
        data-variant={variant}
        ref={ref}
        type={type}
        {...props}
      >
        {children}
      </button>
    );
  },
);
