import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RegistrationResult } from "@/types/api";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 활성 기간의 내 신청 내역 (취소 제외)
  const period = await prisma.registrationPeriod.findFirst({
    where: { isActive: true },
    orderBy: { openAt: "desc" },
  });
  if (!period) return NextResponse.json([]);

  const myRegs = await prisma.registration.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["CONFIRMED", "WAITLIST"] },
      course: { yearMonth: period.yearMonth },
    },
    include: {
      course: {
        include: { instructor: { select: { name: true, themeColor: true } } },
      },
    },
    orderBy: { registeredAt: "asc" },
  });

  if (myRegs.length === 0) return NextResponse.json([]);

  const results: RegistrationResult[] = await Promise.all(
    myRegs.map(async (reg) => {
      const courseId = reg.courseId;

      // 수업 전체 신청자 목록 (시간순)
      const allRegs = await prisma.registration.findMany({
        where: { courseId, status: { in: ["CONFIRMED", "WAITLIST"] } },
        include: { user: { select: { name: true } } },
        orderBy: { registeredAt: "asc" },
      });

      const confirmedList = allRegs
        .filter((r) => r.status === "CONFIRMED")
        .map((r, idx) => ({
          rank: idx + 1,
          name: r.user.name,
          registeredAt: r.registeredAt.toISOString(),
          isMe: r.userId === session.user.id,
        }));

      const waitlistList = allRegs
        .filter((r) => r.status === "WAITLIST")
        .sort((a, b) => (a.waitlistOrder ?? 0) - (b.waitlistOrder ?? 0))
        .map((r) => ({
          order: r.waitlistOrder ?? 0,
          name: r.user.name,
          registeredAt: r.registeredAt.toISOString(),
          isMe: r.userId === session.user.id,
        }));

      const myRank =
        reg.status === "CONFIRMED"
          ? confirmedList.find((x) => x.isMe)?.rank ?? null
          : null;

      return {
        id: reg.id,
        status: reg.status,
        waitlistOrder: reg.waitlistOrder,
        myRank,
        registeredAt: reg.registeredAt.toISOString(),
        confirmedAt: reg.confirmedAt?.toISOString() ?? null,
        course: {
          id: reg.course.id,
          name: reg.course.name,
          courseType: reg.course.courseType,
          level: reg.course.level,
          schedule: reg.course.schedule,
          daysCount: reg.course.daysCount,
          tuitionFee: reg.course.tuitionFee,
          instructor: reg.course.instructor
            ? { name: reg.course.instructor.name, themeColor: reg.course.instructor.themeColor }
            : null,
          instructorNameText: reg.course.instructorNameText,
        },
        confirmedList,
        waitlistList,
      };
    })
  );

  return NextResponse.json(results);
}
