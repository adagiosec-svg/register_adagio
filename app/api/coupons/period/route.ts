import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const period = await prisma.couponPeriod.findFirst({
    where: { isActive: true },
    orderBy: { openAt: "desc" },
  });

  if (!period) return NextResponse.json(null);

  const state =
    now < period.openAt ? "before" : now > period.closeAt ? "closed" : "open";

  return NextResponse.json({
    id: period.id,
    openAt: period.openAt.toISOString(),
    closeAt: period.closeAt.toISOString(),
    state,
  });
}
