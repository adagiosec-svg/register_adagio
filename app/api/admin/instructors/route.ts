import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { encryptSensitive, decryptSensitiveOptional } from "@/lib/crypto";
import { z } from "zod";

// 강사 테마색 자동 배정 팔레트
const THEME_COLORS = [
  "#f97316", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f59e0b", "#10b981", "#6366f1", "#ef4444", "#84cc16",
];

function decryptInstructor(i: {
  id: string;
  name: string;
  phone: string | null;
  themeColor: string;
  subsidyAmount: number;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  memo: string | null;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: i.id,
    name: i.name,
    phone: decryptSensitiveOptional(i.phone),
    themeColor: i.themeColor,
    subsidyAmount: i.subsidyAmount,
    bankName: decryptSensitiveOptional(i.bankName),
    accountNumber: decryptSensitiveOptional(i.accountNumber),
    accountHolder: decryptSensitiveOptional(i.accountHolder),
    memo: i.memo,
    isActive: i.isActive,
    createdAt: i.createdAt.toISOString(),
  };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const instructors = await prisma.instructor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });

  return NextResponse.json(instructors.map((i) => ({
    ...decryptInstructor(i),
    courseCount: i._count.courses,
  })));
}

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  subsidyAmount: z.number().int().nonnegative().optional(),
  bankName: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  accountHolder: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  // 미사용 색상 자동 배정
  const usedColors = await prisma.instructor.findMany({
    where: { isActive: true },
    select: { themeColor: true },
  });
  const usedSet = new Set(usedColors.map((i) => i.themeColor));
  const themeColor = THEME_COLORS.find((c) => !usedSet.has(c)) ?? THEME_COLORS[0];

  const d = parsed.data;
  const instructor = await prisma.instructor.create({
    data: {
      name: d.name,
      phone: d.phone ? encryptSensitive(d.phone) : null,
      themeColor,
      subsidyAmount: d.subsidyAmount ?? 0,
      bankName: d.bankName ? encryptSensitive(d.bankName) : null,
      accountNumber: d.accountNumber ? encryptSensitive(d.accountNumber) : null,
      accountHolder: d.accountHolder ? encryptSensitive(d.accountHolder) : null,
      memo: d.memo ?? null,
    },
  });

  return NextResponse.json(decryptInstructor(instructor), { status: 201 });
}
