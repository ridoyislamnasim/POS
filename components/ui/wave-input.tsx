"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type WaveInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  containerClassName?: string;
  hideZero?: boolean;
};

export function WaveInput({
  label,
  value,
  onChange,
  error,
  className,
  containerClassName,
  id,
  type = "text",
  onWheel,
  hideZero,
  ...props
}: WaveInputProps & { readOnly?: boolean }) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  const readOnly = (props as any).readOnly;
  // display: internal "0" should show placeholder (empty) for numeric pricing/min-stock
  const shouldHideZero = hideZero ?? type === "number";
  const isZero = value === "0" || value === "0.00" || value === "0.0";
  const displayValue = shouldHideZero && isZero ? "" : value ?? "";
  const hasValue = displayValue !== "";

  const handleWheel: React.WheelEventHandler<HTMLInputElement> = (e) => {
    (e.target as HTMLInputElement).blur();
    onWheel?.(e as any);
  };

  return (
    <div className={cn("wave-group relative", containerClassName)}>
      <input
        id={inputId}
        type={type}
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        onWheel={handleWheel}
        placeholder=" "
        autoComplete="off"
        className={cn(
          // bordered, compact box
          "peer input h-8 w-full rounded-md border border-input bg-background px-2.5 pt-1 text-sm ring-offset-background placeholder:text-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
          readOnly && "bg-muted/50 cursor-not-allowed focus-visible:ring-0 focus-visible:border-input",
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        {...props}
      />
      {/* animated bar - bottom highlight inside bordered box */}
      <span className="bar pointer-events-none absolute bottom-0 left-0 block h-[2px] w-full overflow-hidden rounded-b-md">
        <span className="absolute bottom-0 left-1/2 h-[2px] w-0 bg-primary transition-all duration-200 peer-focus:w-1/2 peer-focus:left-0" />
        <span className="absolute bottom-0 right-1/2 h-[2px] w-0 bg-primary transition-all duration-200 peer-focus:w-1/2 peer-focus:right-0" />
      </span>
      <label
        htmlFor={inputId}
        className={cn(
          "label pointer-events-none absolute left-2 flex bg-background px-1 text-sm leading-none text-muted-foreground transition-all",
          // resting inside input
          "top-1/2 -translate-y-1/2",
          // floated when focused or has value
          "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-primary",
          hasValue && "top-0 -translate-y-1/2 text-[11px]",
          hasValue && "text-muted-foreground",
          // when focused with value keep primary color
          "peer-focus:text-primary"
        )}
      >
        {label.split("").map((char, index) => (
          <span
            key={`${char}-${index}`}
            className="label-char inline-block transition-all duration-200 ease-in-out"
            style={{ transitionDelay: `${index * 0.05}s` } as React.CSSProperties}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </label>
      <style jsx>{`
        .wave-group .label-char {
          transition: 0.2s ease all;
          transition-delay: calc(var(--index) * 0.05s);
        }
        /* wave motion when input focused or has value */
        .wave-group .input:focus ~ .label .label-char,
        .wave-group .input:not(:placeholder-shown) ~ .label .label-char {
          transform: translateY(-2px);
        }
        .wave-group .input:focus ~ .label,
        .wave-group .input:not(:placeholder-shown) ~ .label {
          color: hsl(var(--primary));
        }
        /* keep unfocused floated label muted */
        .wave-group .input:not(:placeholder-shown):not(:focus) ~ .label {
          color: hsl(var(--muted-foreground));
        }
      `}</style>
    </div>
  );
}
