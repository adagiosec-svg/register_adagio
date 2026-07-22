import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { yearMonth, instructorId, paid } = await req.json();
  if (!yearMonth || !instructorId) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const key = `payout_status_${yearMonth}`;

  const existing = await prisma.systemConfig.findUnique({ where: { key } });
  const current: Record<string, boolean> = existing ? JSON.parse(existing.value) : {};
  current[instructorId] = Boolean(paid);

  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value: JSON.stringify(current), updatedBy: "admin" },
    update: { value: JSON.stringify(current), updatedAt: new Date(), updatedBy: "admin" },
  });

  return NextResponse.json({ ok: true });
}
