import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPaymentUnpaidNotice } from "@/lib/email";

// Vercel Cron Job — 매일 새벽 1시 실행
// 수강신청 마감 후 PENDING 상태인 확정자를 UNPAID로 전환

export async function GET(req: NextRequest) {
  // Vercel Cron 인증: CRON_SECRET 헤더 검증
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 이미 마감된 활성 기간 찾기
  const closedPeriods = await prisma.registrationPeriod.findMany({
    where: { closeAt: { lt: now }, isActive: true },
  });

  let processed = 0;

  for (const period of closedPeriods) {
    // 해당 기간 수업의 CONFIRMED + PENDING 신청 → UNPAID
    const pendingRegs = await prisma.registration.findMany({
      where: {
        status: "CONFIRMED",
        paymentStatus: "PENDING",
        course: { yearMonth: period.yearMonth },
      },
      include: {
        user: { select: { username: true, name: true } },
        course: { select: { name: true } },
      },
    });

    for (const reg of pendingRegs) {
      await prisma.registration.update({
        where: { id: reg.id },
        data: { paymentStatus: "UNPAID" },
      });

      // 이메일 알림 (비동기, 실패해도 진행)
      void sendPaymentUnpaidNotice(reg.user.username, reg.course.name).catch(() => null);
      processed++;
    }

    // EnrollmentHistory 기록 — 아직 기록 안 된 CONFIRMED 신청
    const confirmedRegs = await prisma.registration.findMany({
      where: {
        status: "CONFIRMED",
        course: { yearMonth: period.yearMonth },
        enrollmentHistory: null,
      },
      include: {
        user: { select: { grade: true } },
        course: { select: { name: true, courseType: true, tuitionFee: true, instructorFee: true, yearMonth: true } },
      },
    });

    for (const reg of confirmedRegs) {
      if (!reg.confirmedAt || !reg.user.grade) continue;
      await prisma.enrollmentHistory.create({
        data: {
          userId: reg.userId,
          registrationId: reg.id,
          courseId: reg.courseId,
          courseName: reg.course.name,
          courseType: reg.course.courseType,
          gradeAtTime: reg.user.grade,
          tuitionFee: reg.course.tuitionFee,
          instructorFee: reg.course.instructorFee,
          tuitionPaymentStatus: reg.paymentStatus,
          finalStatus: "CONFIRMED",
          confirmedAt: reg.confirmedAt,
          yearMonth: reg.course.yearMonth,
        },
      }).catch(() => null); // 이미 존재하면 무시
    }

    // 기간 비활성화
    await prisma.registrationPeriod.update({
      where: { id: period.id },
      data: { isActive: false },
    });
  }

  return NextResponse.json({ ok: true, processed, periods: closedPeriods.length });
}
