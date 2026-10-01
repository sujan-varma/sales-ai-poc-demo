"use client";

import { useRouter } from "next/navigation";
import { CortexNavProvider, PAGE_HREF } from "@/components/cortex/nav";

/** Page switches inside the Sales AI flow go through the Next router. */
export function NextCortexNav({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return <CortexNavProvider go={(page) => router.push(PAGE_HREF[page])}>{children}</CortexNavProvider>;
}
