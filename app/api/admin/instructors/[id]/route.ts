import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { encryptSensitive, decryptSensitiveOptional } from "@/lib/crypto";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  subsidyAmount: z.number().int().nonnegative().optional(),
  bankName: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  accountHolder: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const d = parsed.data;
  const updated = await prisma.instructor.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.phone !== undefined ? { phone: d.phone ? encryptSensitive(d.phone) : null } : {}),
      ...(d.subsidyAmount !== undefined ? { subsidyAmount: d.subsidyAmount } : {}),
      ...(d.bankName !== undefined ? { bankName: d.bankName ? encryptSensitive(d.bankName) : null } : {}),
      ...(d.accountNumber !== undefined ? { accountNumber: d.accountNumber ? encryptSensitive(d.accountNumber) : null } : {}),
      ...(d.accountHolder !== undefined ? { accountHolder: d.accountHolder ? encryptSensitive(d.accountHolder) : null } : {}),
      ...(d.memo !== undefined ? { memo: d.memo } : {}),
      ...(d.themeColor !== undefined ? { themeColor: d.themeColor } : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    phone: decryptSensitiveOptional(updated.phone),
    themeColor: updated.themeColor,
    subsidyAmount: updated.subsidyAmount,
    bankName: decryptSensitiveOptional(updated.bankName),
    accountNumber: decryptSensitiveOptional(updated.accountNumber),
    accountHolder: decryptSensitiveOptional(updated.accountHolder),
    memo: updated.memo,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await prisma.instructor.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
