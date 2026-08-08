import { clsx } from "clsx";
import type { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={clsx("block text-sm font-medium text-ink mb-1.5", props.className)}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  const { error, className, ...rest } = props;
  return (
    <div>
      <input
        {...rest}
        className={clsx(
          "w-full rounded-md border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink2/50",
          "focus:outline-none focus:ring-2 focus:ring-ledger/30 focus:border-ledger",
          error ? "border-danger" : "border-line",
          className
        )}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Textarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }
) {
  const { error, className, ...rest } = props;
  return (
    <div>
      <textarea
        {...rest}
        className={clsx(
          "w-full rounded-md border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink2/50",
          "focus:outline-none focus:ring-2 focus:ring-ledger/30 focus:border-ledger",
          error ? "border-danger" : "border-line",
          className
        )}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
