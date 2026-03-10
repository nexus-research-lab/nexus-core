"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "default";
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3 pb-3">
          <h3 id="confirm-dialog-title" className="text-base font-semibold text-foreground">
            {title}
          </h3>
          <button
            aria-label="关闭"
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p id="confirm-dialog-message" className="text-sm text-muted-foreground">
          {message}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/50"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-primary-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 ${
              variant === "danger"
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-primary hover:bg-primary/90"
            }`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// 简单的 prompt 对话框
interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  isOpen,
  title,
  message,
  placeholder = "",
  defaultValue = "",
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);

  // 当对话框打开时重置值
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      setValue(defaultValue);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      onConfirm(value);
    }
  };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel, onConfirm, value, defaultValue]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3 pb-3">
          <h3 id="prompt-dialog-title" className="text-base font-semibold text-foreground">
            {title}
          </h3>
          <button
            aria-label="关闭"
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
            onClick={() => {
              setValue(defaultValue);
              onCancel();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {message && (
          <p className="pb-3 text-sm text-muted-foreground">{message}</p>
        )}

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/50"
            onClick={() => {
              setValue(defaultValue);
              onCancel();
            }}
          >
            取消
          </button>
          <button
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/50"
            onClick={() => onConfirm(value)}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
