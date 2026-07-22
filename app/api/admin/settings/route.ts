import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { encryptSensitive, decryptSensitiveOptional } from "@/lib/crypto";
import { SENSITIVE_CONFIG_KEYS } from "@/lib/system-config";
import { z } from "zod";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const rows = await prisma.systemConfig.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(
    Object.fromEntries(
      rows.map((r) => [
        r.key,
        SENSITIVE_CONFIG_KEYS.has(r.key)
          ? (decryptSensitiveOptional(r.value) ?? r.value)
          : r.value,
      ])
    )
  );
}

const schema = z.record(z.string());

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const adminId = session!.user.id;
  const keys = Object.keys(parsed.data);

  // 변경 전 현재 값 조회
  const existingRows = await prisma.systemConfig.findMany({ where: { key: { in: keys } } });
  const oldEncrypted = Object.fromEntries(existingRows.map((r) => [r.key, r.value]));

  // 민감 키는 암호화하여 저장
  const toStore = Object.fromEntries(
    Object.entries(parsed.data).map(([key, value]) => [
      key,
      SENSITIVE_CONFIG_KEYS.has(key) ? encryptSensitive(value) : value,
    ])
  );

  await prisma.$transaction(
    Object.entries(toStore).map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        create: { key, value, updatedBy: adminId },
        update: { value, updatedBy: adminId },
      })
    )
  );

  // 변경 이력 — 민감 키는 "[변경됨]"으로 기록 (평문 노출 방지)
  const logEntries = Object.entries(parsed.data)
    .filter(([key, newPlain]) => {
      if (oldEncrypted[key] === undefined) return false;
      if (SENSITIVE_CONFIG_KEYS.has(key)) {
        const oldPlain = decryptSensitiveOptional(oldEncrypted[key]) ?? oldEncrypted[key];
        return oldPlain !== newPlain;
      }
      return oldEncrypted[key] !== newPlain;
    })
    .map(([key, newPlain]) => ({
      key,
      oldValue: SENSITIVE_CONFIG_KEYS.has(key) ? "[암호화됨]" : oldEncrypted[key],
      newValue: SENSITIVE_CONFIG_KEYS.has(key) ? "[암호화됨]" : newPlain,
      updatedBy: adminId,
    }));

  if (logEntries.length > 0) {
    await prisma.systemConfigLog.createMany({ data: logEntries });
  }

  return NextResponse.json({ ok: true });
}
