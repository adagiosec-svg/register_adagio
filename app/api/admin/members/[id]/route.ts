import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { sendApprovedNotice, sendRejectedNotice } from "@/lib/email";
import { encryptPhone, phoneLastFour } from "@/lib/crypto";
import { z } from "zod";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    mateId: z.string().min(1),
    grade: z.enum(["REGULAR", "ASSOCIATE"]),
  }),
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("suspend") }),
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("dormant") }),
  z.object({
    action: z.literal("update"),
    name: z.string().min(1).optional(),
    phone: z.string().regex(/^01[0-9]-\d{3,4}-\d{4}$/).optional(),
    grade: z.enum(["REGULAR", "ASSOCIATE"]).optional(),
    mateId: z.string().optional(),
  }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const data = parsed.data;
  const adminId = session!.user.id;

  switch (data.action) {
    case "approve": {
      // mateId 중복 체크
      const existing = await prisma.user.findUnique({ where: { mateId: data.mateId } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "이미 사용 중인 mateID입니다." }, { status: 409 });
      }
      const approved = await prisma.user.update({
        where: { id },
        data: {
          status: "ACTIVE",
          grade: data.grade,
          mateId: data.mateId,
          approvedAt: new Date(),
          approvedById: adminId,
        },
        select: { username: true },
      });
      sendApprovedNotice(approved.username, data.grade).catch(console.error);
      break;
    }

    case "reject": {
      const rejected = await prisma.user.update({
        where: { id },
        data: { status: "REJECTED" },
        select: { username: true },
      });
      sendRejectedNotice(rejected.username).catch(console.error);
      break;
    }

    case "suspend":
      await prisma.user.update({ where: { id }, data: { status: "SUSPENDED" } });
      break;

    case "activate":
      await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });
      break;

    case "dormant":
      await prisma.user.update({ where: { id }, data: { status: "DORMANT" } });
      break;

    case "update":
      await prisma.user.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.phone
            ? { phoneEncrypted: encryptPhone(data.phone), phoneLast4: phoneLastFour(data.phone) }
            : {}),
          ...(data.grade ? { grade: data.grade } : {}),
          ...(data.mateId !== undefined ? { mateId: data.mateId || null } : {}),
        },
      });
      break;

    default:
      return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!user) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  }

  if (user.status !== "DORMANT" && user.status !== "REJECTED") {
    return NextResponse.json(
      { error: "휴면 또는 거절 상태의 회원만 삭제할 수 있습니다." },
      { status: 403 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
