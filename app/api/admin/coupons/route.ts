import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // PENDING | PROCESSED

  const applications = await prisma.couponApplication.findMany({
    where: status ? { status: status as "PENDING" | "PROCESSED" } : {},
    include: {
      user: { select: { name: true, username: true } },
      usages: true,
    },
    orderBy: { appliedAt: "desc" },
  });

  return NextResponse.json(
    applications.map((a) => ({
      ...a,
      appliedAt: a.appliedAt.toISOString(),
      validUntil: a.validUntil?.toISOString() ?? null,
      processedAt: a.processedAt?.toISOString() ?? null,
    }))
  );
}
