import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const yearMonth =
    searchParams.get("yearMonth") ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const period = await prisma.registrationPeriod.findFirst({
    where: { yearMonth },
    orderBy: { openAt: "desc" },
  });
  return NextResponse.json(period ?? null);
}

const createSchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  openAt: z.string().datetime(),
  closeAt: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const { yearMonth, openAt, closeAt } = parsed.data;

  const period = await prisma.registrationPeriod.upsert({
    where: { yearMonth },
    create: { yearMonth, openAt: new Date(openAt), closeAt: new Date(closeAt), isActive: true },
    update: { openAt: new Date(openAt), closeAt: new Date(closeAt), isActive: true },
  });
  return NextResponse.json(period, { status: 201 });
}

const patchSchema = z.object({
  openAt: z.string().datetime().optional(),
  closeAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const { openAt, closeAt, isActive } = parsed.data;
  const period = await prisma.registrationPeriod.update({
    where: { id },
    data: {
      ...(openAt ? { openAt: new Date(openAt) } : {}),
      ...(closeAt ? { closeAt: new Date(closeAt) } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });
  return NextResponse.json(period);
}
