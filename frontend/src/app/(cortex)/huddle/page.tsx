import type { Metadata } from "next";
import { DataGate } from "@/components/cortex/DataGate";

export const metadata: Metadata = { title: "Sales AI · Intel Hub" };

export default function Page() {
  return <DataGate view="huddle" />;
}
