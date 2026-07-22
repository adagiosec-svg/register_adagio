import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CourseWithStats } from "@/types/api";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  let yearMonth = searchParams.get("yearMonth");

  // yearMonth 미지정 시 활성 기간 또는 이번 달 사용
  if (!yearMonth) {
    const activePeriod = await prisma.registrationPeriod.findFirst({
      where: { isActive: true },
      orderBy: { openAt: "desc" },
    });
    yearMonth = activePeriod?.yearMonth ?? format(new Date(), "yyyy-MM");
  }

  const courses = await prisma.course.findMany({
    where: {
      yearMonth,
      isActive: true,
      courseType: { in: ["FULL", "HALF"] }, // Special은 별도 페이지
    },
    include: {
      instructor: { select: { id: true, name: true, themeColor: true } },
    },
    orderBy: { schedule: "asc" },
  });

  if (courses.length === 0) return NextResponse.json([]);

  const courseIds = courses.map((c) => c.id);

  // 수업별 확정/대기 카운트 일괄 조회
  const counts = await prisma.registration.groupBy({
    by: ["courseId", "status"],
    where: { courseId: { in: courseIds } },
    _count: true,
  });

  // 내 신청 내역
  const myRegs = await prisma.registration.findMany({
    where: { userId: session.user.id, courseId: { in: courseIds } },
  });

  // 내 확정 순서 계산 (수업별로 registeredAt 기준 순서)
  const myRankMap: Record<string, number | null> = {};
  for (const myReg of myRegs) {
    if (myReg.status !== "CONFIRMED") {
      myRankMap[myReg.courseId] = null;
      continue;
    }
    const rank = await prisma.registration.count({
      where: {
        courseId: myReg.courseId,
        status: "CONFIRMED",
        registeredAt: { lte: myReg.registeredAt },
      },
    });
    myRankMap[myReg.courseId] = rank;
  }

  const countMap = Object.fromEntries(
    courseIds.map((id) => [
      id,
      {
        confirmed: counts.find((c) => c.courseId === id && c.status === "CONFIRMED")?._count ?? 0,
        waitlist: counts.find((c) => c.courseId === id && c.status === "WAITLIST")?._count ?? 0,
      },
    ])
  );

  const myRegMap = Object.fromEntries(myRegs.map((r) => [r.courseId, r]));

  const result: CourseWithStats[] = courses.map((c) => ({
    id: c.id,
    name: c.name,
    schedule: c.schedule,
    courseType: c.courseType,
    level: c.level,
    capacity: c.capacity,
    tuitionFee: c.tuitionFee,
    daysCount: c.daysCount,
    durationHours: c.durationHours ? Number(c.durationHours) : null,
    instructor: c.instructor
      ? { id: c.instructor.id, name: c.instructor.name, themeColor: c.instructor.themeColor }
      : null,
    instructorNameText: c.instructorNameText,
    confirmedCount: countMap[c.id].confirmed,
    waitlistCount: countMap[c.id].waitlist,
    myRegistration: myRegMap[c.id]
      ? {
          id: myRegMap[c.id].id,
          status: myRegMap[c.id].status,
          waitlistOrder: myRegMap[c.id].waitlistOrder,
          myRank: myRankMap[c.id] ?? null,
        }
      : null,
  }));

  return NextResponse.json(result);
}
