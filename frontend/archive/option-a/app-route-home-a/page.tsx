import type { Metadata } from "next";
import { OptionAHome } from "@/components/cortex/OptionAHome";

export const metadata: Metadata = { title: "Cortex Home · Option A" };

export default function Page() {
  return <OptionAHome />;
}
