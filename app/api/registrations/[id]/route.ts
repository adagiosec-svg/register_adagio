import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, prismaDirect } from "@/lib/prisma";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { sendWaitlistPromotedNotice } from "@/lib/email";
import { getAllConfig } from "@/lib/system-config";
import { Prisma } from "@prisma/client";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const reg = await prisma.registration.findUnique({
    where: { id },
    include: { course: { select: { name: true, tuitionFee: true } } },
  });

  if (!reg) return NextResponse.json({ error: "신청 내역을 찾을 수 없습니다." }, { status: 404 });
  if (reg.userId !== session.user.id) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  if (reg.status === "CANCELLED") return NextResponse.json({ error: "이미 취소된 신청입니다." }, { status: 409 });

  // 수강신청 기간 확인
  const period = await prisma.registrationPeriod.findFirst({
    where: { isActive: true },
    orderBy: { openAt: "desc" },
  });
  if (!period || new Date() > period.closeAt) {
    return NextResponse.json({ error: "수강신청 기간이 아닙니다. 취소할 수 없습니다." }, { status: 400 });
  }

  const courseId = reg.courseId;
  const promoted: { user: { username: string } | null } = { user: null };
  const courseName = reg.course.name;
  const tuitionFee = reg.course.tuitionFee;

  await prismaDirect.$transaction(
    async (tx) => {
      // 1. 취소 처리
      await tx.registration.update({
        where: { id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      // 2. 확정자가 취소한 경우 → 후보 1번 자동 승격
      if (reg.status === "CONFIRMED") {
        const waitlist1 = await tx.registration.findFirst({
          where: { courseId, status: "WAITLIST", waitlistOrder: 1 },
          include: { user: { select: { username: true } } },
        });

        if (waitlist1) {
          await tx.registration.update({
            where: { id: waitlist1.id },
            data: { status: "CONFIRMED", waitlistOrder: null, confirmedAt: new Date() },
          });

          // 나머지 후보 순위 -1씩 당김
          await tx.registration.updateMany({
            where: { courseId, status: "WAITLIST", waitlistOrder: { gt: 1 } },
            data: { waitlistOrder: { decrement: 1 } },
          });

          promoted.user = { username: waitlist1.user.username };
        }
      } else if (reg.status === "WAITLIST" && reg.waitlistOrder != null) {
        // 후보가 취소한 경우 → 뒤 순위 앞당기기
        await tx.registration.updateMany({
          where: { courseId, status: "WAITLIST", waitlistOrder: { gt: reg.waitlistOrder } },
          data: { waitlistOrder: { decrement: 1 } },
        });
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  // 실시간 브로드캐스트
  const [confirmedCount, waitlistCount] = await Promise.all([
    prisma.registration.count({ where: { courseId, status: "CONFIRMED" } }),
    prisma.registration.count({ where: { courseId, status: "WAITLIST" } }),
  ]);
  await pusherServer.trigger(CHANNELS.course(courseId), EVENTS.ENROLLMENT_UPDATED, {
    confirmedCount,
    waitlistCount,
  });

  // 승격된 사용자에게 이메일 발송 (비동기)
  if (promoted.user) {
    const config = await getAllConfig();
    const bankInfo = `${config.tuition_account_bank} ${config.tuition_account_number} (${config.tuition_account_holder})`;
    void sendWaitlistPromotedNotice(promoted.user.username, courseName, tuitionFee, bankInfo);
  }

  return NextResponse.json({ ok: true });
}
