import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

type AdminResult =
  | { error: NextResponse; session: null }
  | { error: null; session: Session };

export async function requireAdmin(): Promise<AdminResult> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session: null,
    };
  }
  return { error: null, session };
}
