import type { Metadata } from "next";
import { DataGate } from "@/components/cortex/DataGate";

export const metadata: Metadata = { title: "Sales AI · Leadership" };

export default function Page() {
  return <DataGate view="leadership" />;
}
