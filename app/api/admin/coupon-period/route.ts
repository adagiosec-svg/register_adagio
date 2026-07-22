import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const period = await prisma.couponPeriod.findFirst({
    where: { isActive: true },
    orderBy: { openAt: "desc" },
  });
  return NextResponse.json(period ?? null);
}

const schema = z.object({
  openAt: z.string().datetime(),
  closeAt: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  // 기존 비활성화
  await prisma.couponPeriod.updateMany({ where: { isActive: true }, data: { isActive: false } });

  const period = await prisma.couponPeriod.create({
    data: {
      openAt: new Date(parsed.data.openAt),
      closeAt: new Date(parsed.data.closeAt),
      isActive: true,
    },
  });
  return NextResponse.json(period, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const body = await req.json();
  const parsed = z
    .object({
      openAt: z.string().datetime().optional(),
      closeAt: z.string().datetime().optional(),
      isActive: z.boolean().optional(),
    })
    .safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const d = parsed.data;
  const updated = await prisma.couponPeriod.update({
    where: { id },
    data: {
      ...(d.openAt ? { openAt: new Date(d.openAt) } : {}),
      ...(d.closeAt ? { closeAt: new Date(d.closeAt) } : {}),
      ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
    },
  });
  return NextResponse.json(updated);
}
