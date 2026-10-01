import { redirect } from "next/navigation";

// Old Option B URL — the ASM dashboard now lives at /asm.
export default function Page() {
  redirect("/asm");
}
