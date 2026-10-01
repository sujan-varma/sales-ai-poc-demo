import { redirect } from "next/navigation";

// The ASM dashboard (Option B) is the entry point of the Sales AI flow.
export default function Page() {
  redirect("/asm");
}
