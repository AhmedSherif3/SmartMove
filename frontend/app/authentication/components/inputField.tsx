"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type InputFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "title"> & {
  title: string;
  helperText?: string;
  error?: string;
  containerClassName?: string;
};

export default function InputField({
  title,
  placeholder,
  type = "text",
  helperText,
  error,
  id,
  className,
  containerClassName,
  ...inputProps
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const currentType = isPassword ? (showPassword ? "text" : "password") : type;

  const inputId = id ?? `input-${title.toLowerCase().replace(/\s+/g, "-")}`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const baseInputClassName =
    "w-full rounded-xl border border-border-subtle bg-surface-card/90 px-4 py-3 pr-11 text-sm text-content-primary shadow-sm backdrop-blur-sm transition-all duration-200 placeholder:text-content-muted focus:border-brand-primary focus:outline-none focus:ring-4 focus:ring-brand-primary/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-400";
  const errorInputClassName =
    "border-status-error focus:border-status-error focus:ring-status-error/20";

  return (
    <div className={`w-full mt-3 space-y-2 ${containerClassName ?? ""}`.trim()}>
      <label
        htmlFor={inputId}
        className="text-sm font-semibold tracking-wide text-content-strong dark:text-slate-100"
      >
        {title}
      </label>

      <div className="relative">
        <input
          id={inputId}
          type={currentType}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`${baseInputClassName} ${error ? errorInputClassName : ""} ${className ?? ""}`.trim()}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff size={18} strokeWidth={2} />
            ) : (
              <Eye size={18} strokeWidth={2} />
            )}
          </button>
        )}
      </div>

      {error ? (
        <p id={errorId} className="text-xs font-medium text-status-error">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-content-secondary dark:text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}