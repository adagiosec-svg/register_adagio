import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  action: z.literal("process"),
  validDays: z.number().int().min(1).max(365).optional(), // default 90
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + (parsed.data.validDays ?? 90));

  const updated = await prisma.couponApplication.update({
    where: { id },
    data: {
      status: "PROCESSED",
      validUntil,
      processedAt: new Date(),
      processedBy: session!.user.id,
    },
  });

  return NextResponse.json({
    ...updated,
    appliedAt: updated.appliedAt.toISOString(),
    validUntil: updated.validUntil?.toISOString() ?? null,
    processedAt: updated.processedAt?.toISOString() ?? null,
  });
}
