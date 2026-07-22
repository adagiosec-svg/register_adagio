import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, prismaDirect } from "@/lib/prisma";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { Prisma, UserStatus } from "@prisma/client";
import { z } from "zod";

const schema = z.object({ courseId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 서버에서 사용자 상태 재검증 (클라이언트 우회 방지)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, mateId: true },
  });
  if (!user || user.status !== UserStatus.ACTIVE) {
    return NextResponse.json({ error: "수강신청 권한이 없습니다." }, { status: 403 });
  }
  if (!user.mateId) {
    return NextResponse.json({ error: "mateID가 등록되지 않은 회원은 수강신청할 수 없습니다." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { courseId } = parsed.data;

  // 수강신청 기간 확인
  const period = await prisma.registrationPeriod.findFirst({
    where: { isActive: true },
    orderBy: { openAt: "desc" },
  });
  const now = new Date();
  if (!period || now < period.openAt || now > period.closeAt) {
    return NextResponse.json({ error: "수강신청 기간이 아닙니다." }, { status: 400 });
  }

  // 중복 신청 확인
  const existing = await prisma.registration.findFirst({
    where: {
      userId: session.user.id,
      courseId,
      status: { in: ["CONFIRMED", "WAITLIST"] },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "이미 신청한 수업입니다." }, { status: 409 });
  }

  // 선착순/후보 트랜잭션 — SELECT FOR UPDATE로 동시 신청 충돌 방지
  let registration;
  try {
    registration = await prismaDirect.$transaction(
      async (tx) => {
        // 수업 행 잠금 (동시 접근 직렬화)
        const [course] = await tx.$queryRaw<Array<{ id: string; capacity: number }>>`
          SELECT id, capacity FROM "Course" WHERE id::text = ${courseId} FOR UPDATE
        `;
        if (!course) throw new Error("COURSE_NOT_FOUND");

        const confirmedCount = await tx.registration.count({
          where: { courseId, status: "CONFIRMED" },
        });

        const now = new Date();
        if (confirmedCount < course.capacity) {
          // 정원 내 → 확정 (취소 후 재신청 시 기존 레코드 업데이트)
          return tx.registration.upsert({
            where: { userId_courseId: { userId: session.user.id, courseId } },
            create: {
              userId: session.user.id,
              courseId,
              status: "CONFIRMED",
              confirmedAt: now,
            },
            update: {
              status: "CONFIRMED",
              confirmedAt: now,
              cancelledAt: null,
              waitlistOrder: null,
              paymentStatus: "PENDING",
              clubFeePaymentStatus: null,
              paymentUpdatedAt: null,
              paymentUpdatedById: null,
              registeredAt: now,
            },
          });
        } else {
          // 정원 초과 → 후보
          const maxOrder = await tx.registration.aggregate({
            where: { courseId, status: "WAITLIST" },
            _max: { waitlistOrder: true },
          });
          const nextOrder = (maxOrder._max.waitlistOrder ?? 0) + 1;
          return tx.registration.upsert({
            where: { userId_courseId: { userId: session.user.id, courseId } },
            create: {
              userId: session.user.id,
              courseId,
              status: "WAITLIST",
              waitlistOrder: nextOrder,
            },
            update: {
              status: "WAITLIST",
              waitlistOrder: nextOrder,
              confirmedAt: null,
              cancelledAt: null,
              paymentStatus: "PENDING",
              clubFeePaymentStatus: null,
              paymentUpdatedAt: null,
              paymentUpdatedById: null,
              registeredAt: now,
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (err: unknown) {
    const prismaError = err as { code?: string; message?: string };
    if (prismaError.code === "P2034") {
      // Serialization failure — 동시 요청 충돌
      return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 409 });
    }
    if (prismaError.message === "COURSE_NOT_FOUND") {
      return NextResponse.json({ error: "수업을 찾을 수 없습니다." }, { status: 404 });
    }
    throw err;
  }

  // 실시간 인원 현황 브로드캐스트
  const [confirmedCount, waitlistCount] = await Promise.all([
    prisma.registration.count({ where: { courseId, status: "CONFIRMED" } }),
    prisma.registration.count({ where: { courseId, status: "WAITLIST" } }),
  ]);

  try {
    await pusherServer.trigger(CHANNELS.course(courseId), EVENTS.ENROLLMENT_UPDATED, {
      confirmedCount,
      waitlistCount,
    });
  } catch (e) {
    console.error("[Pusher] trigger failed:", e);
  }

  return NextResponse.json(
    {
      id: registration.id,
      status: registration.status,
      waitlistOrder: registration.waitlistOrder,
    },
    { status: 201 }
  );
}
