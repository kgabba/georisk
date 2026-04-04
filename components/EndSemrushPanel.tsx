import type { ReactNode } from "react";

export function EndSemrushPanel({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8 lg:pb-10">
      <div className="flex flex-col [&>*:first-child]:mb-12 [&>*:first-child]:sm:mb-14 [&>*:first-child]:lg:mb-16">
        {children}
      </div>
    </div>
  );
}
