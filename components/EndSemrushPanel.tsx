import type { ReactNode } from "react";

export function EndSemrushPanel({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 sm:gap-9 lg:gap-10">{children}</div>
    </div>
  );
}
