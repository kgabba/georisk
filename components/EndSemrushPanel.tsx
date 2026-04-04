import type { ReactNode } from "react";

export function EndSemrushPanel({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-12 sm:gap-14 lg:gap-16">{children}</div>
    </div>
  );
}
