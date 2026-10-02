import type { Metadata } from "next";
import { DataGate } from "@/components/cortex/DataGate";

export const metadata: Metadata = { title: "Sales AI · Logs" };

export default function Page() {
  return <DataGate view="asm-logs-activity" />;
}
