import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function generateTempPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // 혼동되는 문자 제외 (0,o,1,l,i)
  let pw = "";
  for (let i = 0; i < 8; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({ where: { id }, data: { passwordHash } });

  return NextResponse.json({ tempPassword });
}
