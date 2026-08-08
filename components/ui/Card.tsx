import { clsx } from "clsx";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("bg-white border border-line rounded-card shadow-card", className)}
      {...props}
    />
  );
}
