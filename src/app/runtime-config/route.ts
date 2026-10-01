// Runtime configuration for the browser, read from the server's environment on every request, so one image
// can be deployed anywhere: set API_URL to the backend's public URL (as the browser reaches it).

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return NextResponse.json({ apiUrl: apiUrl.replace(/\/$/, "") }, { headers: { "Cache-Control": "no-store" } });
}
