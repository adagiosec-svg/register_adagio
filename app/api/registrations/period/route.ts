import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RegistrationPeriodInfo } from "@/types/api";

export async function GET() {
  const period = await prisma.registrationPeriod.findFirst({
    where: { isActive: true },
    orderBy: { openAt: "desc" },
  });

  if (!period) return NextResponse.json(null);

  const now = new Date();
  const state: RegistrationPeriodInfo["state"] =
    now < period.openAt ? "before" : now > period.closeAt ? "closed" : "open";

  const info: RegistrationPeriodInfo = {
    id: period.id,
    yearMonth: period.yearMonth,
    openAt: period.openAt.toISOString(),
    closeAt: period.closeAt.toISOString(),
    isActive: period.isActive,
    state,
  };
  return NextResponse.json(info);
}
