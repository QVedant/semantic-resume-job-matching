import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

// POST /api/auth/logout: removes the session cookie ("takes the wristband off").
export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ redirectTo: "/" });
}
