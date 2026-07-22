import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, prismaDirect } from "@/lib/prisma";
import { Prisma, UserStatus } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: specialCourseId } = await params;

  // 사용자 상태 검증
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, mateId: true },
  });
  if (!user || user.status !== UserStatus.ACTIVE) {
    return NextResponse.json({ error: "신청 권한이 없습니다." }, { status: 403 });
  }

  // 중복 신청 방지
  const existing = await prisma.specialRegistration.findUnique({
    where: { userId_specialCourseId: { userId: session.user.id, specialCourseId } },
  });
  if (existing && existing.status !== "CANCELLED") {
    return NextResponse.json({ error: "이미 신청한 수업입니다." }, { status: 409 });
  }

  let registration;
  try {
    registration = await prismaDirect.$transaction(
      async (tx) => {
        const [course] = await tx.$queryRaw<Array<{ id: string; capacity: number }>>`
          SELECT id, capacity FROM "SpecialCourse" WHERE id::text = ${specialCourseId} FOR UPDATE
        `;
        if (!course) throw new Error("NOT_FOUND");

        const confirmedCount = await tx.specialRegistration.count({
          where: { specialCourseId, status: "CONFIRMED" },
        });

        if (confirmedCount < course.capacity) {
          return existing
            ? tx.specialRegistration.update({
                where: { id: existing.id },
                data: { status: "CONFIRMED", waitlistOrder: null, confirmedAt: new Date(), cancelledAt: null },
              })
            : tx.specialRegistration.create({
                data: {
                  userId: session.user.id,
                  specialCourseId,
                  status: "CONFIRMED",
                  confirmedAt: new Date(),
                },
              });
        } else {
          const maxOrder = await tx.specialRegistration.aggregate({
            where: { specialCourseId, status: "WAITLIST" },
            _max: { waitlistOrder: true },
          });
          const nextOrder = (maxOrder._max.waitlistOrder ?? 0) + 1;
          return existing
            ? tx.specialRegistration.update({
                where: { id: existing.id },
                data: { status: "WAITLIST", waitlistOrder: nextOrder, cancelledAt: null },
              })
            : tx.specialRegistration.create({
                data: {
                  userId: session.user.id,
                  specialCourseId,
                  status: "WAITLIST",
                  waitlistOrder: nextOrder,
                },
              });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "P2034") return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 409 });
    if (e.message === "NOT_FOUND") return NextResponse.json({ error: "수업을 찾을 수 없습니다." }, { status: 404 });
    throw err;
  }

  return NextResponse.json(
    { id: registration.id, status: registration.status, waitlistOrder: registration.waitlistOrder },
    { status: 201 }
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: specialCourseId } = await params;

  const reg = await prisma.specialRegistration.findUnique({
    where: { userId_specialCourseId: { userId: session.user.id, specialCourseId } },
  });
  if (!reg || reg.status === "CANCELLED") {
    return NextResponse.json({ error: "취소할 신청이 없습니다." }, { status: 404 });
  }

  await prismaDirect.$transaction(
    async (tx) => {
      await tx.specialRegistration.update({
        where: { id: reg.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      if (reg.status === "CONFIRMED") {
        const waitlist1 = await tx.specialRegistration.findFirst({
          where: { specialCourseId, status: "WAITLIST", waitlistOrder: 1 },
        });
        if (waitlist1) {
          await tx.specialRegistration.update({
            where: { id: waitlist1.id },
            data: { status: "CONFIRMED", waitlistOrder: null, confirmedAt: new Date() },
          });
          await tx.specialRegistration.updateMany({
            where: { specialCourseId, status: "WAITLIST", waitlistOrder: { gt: 1 } },
            data: { waitlistOrder: { decrement: 1 } },
          });
        }
      } else if (reg.status === "WAITLIST" && reg.waitlistOrder != null) {
        await tx.specialRegistration.updateMany({
          where: { specialCourseId, status: "WAITLIST", waitlistOrder: { gt: reg.waitlistOrder } },
          data: { waitlistOrder: { decrement: 1 } },
        });
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  return NextResponse.json({ ok: true });
}
