import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPortalId, encryptPortalId, encryptPhone, decryptPhone, phoneLastFour } from "@/lib/crypto";

const schema = z.object({
  username: z
    .string()
    .min(4, "아이디는 4자 이상이어야 합니다.")
    .max(20, "아이디는 20자 이하여야 합니다.")
    .regex(/^[a-zA-Z0-9]+$/, "아이디는 영문과 숫자만 사용할 수 있습니다."),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
  name: z.string().min(1, "이름을 입력해주세요."),
  phone: z
    .string()
    .regex(/^01[0-9]-\d{3,4}-\d{4}$/, "전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)"),
  portalId: z.string().min(1, "사내 포탈 ID를 입력해주세요."),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    const firstError = result.error.errors[0];
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  const { username, password, name, phone, portalId } = result.data;

  // 포탈 ID 해시 (중복 가입 방지용)
  const portalIdHash = hashPortalId(portalId);

  try {
    // 중복 검사
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
    }

    const existingPortal = await prisma.user.findUnique({ where: { portalIdHash } });
    if (existingPortal) {
      return NextResponse.json(
        { error: "해당 사내 포탈 ID로 이미 가입된 계정이 있습니다." },
        { status: 409 }
      );
    }

    // 전화번호 중복 검사 (last4 필터 후 복호화 비교)
    const last4 = phoneLastFour(phone);
    const candidates = await prisma.user.findMany({
      where: { phoneLast4: last4 },
      select: { id: true, phoneEncrypted: true },
    });
    for (const c of candidates) {
      try {
        if (decryptPhone(c.phoneEncrypted) === phone) {
          return NextResponse.json(
            { error: "이미 가입된 전화번호입니다." },
            { status: 409 }
          );
        }
      } catch { /* 복호화 실패 무시 */ }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const portalIdEncrypted = encryptPortalId(portalId);
    const phoneEncrypted = encryptPhone(phone);
    const phoneLast4 = phoneLastFour(phone);

    await prisma.user.create({
      data: {
        username,
        passwordHash,
        name,
        phoneEncrypted,
        phoneLast4,
        portalIdHash,
        portalIdEncrypted,
        status: "PENDING",
        role: "USER",
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
