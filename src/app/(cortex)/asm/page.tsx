import type { Metadata } from "next";
import { DataGate } from "@/components/cortex/DataGate";

export const metadata: Metadata = { title: "Sales AI · Area Sales Manager" };

export default function Page() {
  return <DataGate view="asm" />;
}
