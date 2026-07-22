import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import type { CourseWithStats, RegistrationPeriodInfo } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // 활성 수강신청 기간
  const period = await prisma.registrationPeriod.findFirst({
    where: { isActive: true },
    orderBy: { openAt: "desc" },
  });

  const now = new Date();
  let periodInfo: RegistrationPeriodInfo | null = null;
  if (period) {
    const state =
      now < period.openAt ? "before" : now > period.closeAt ? "closed" : "open";
    periodInfo = {
      id: period.id,
      yearMonth: period.yearMonth,
      openAt: period.openAt.toISOString(),
      closeAt: period.closeAt.toISOString(),
      isActive: period.isActive,
      state,
    };
  }

  const yearMonth =
    period?.yearMonth ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 수업 목록 (FULL/HALF만)
  const courses = await prisma.course.findMany({
    where: { yearMonth, courseType: { in: ["FULL", "HALF"] }, isActive: true },
    include: {
      instructor: { select: { id: true, name: true, themeColor: true } },
      registrations: {
        where: { status: { in: ["CONFIRMED", "WAITLIST"] } },
        select: { id: true, userId: true, status: true, waitlistOrder: true, registeredAt: true },
      },
    },
    orderBy: { schedule: "asc" },
  });

  const userId = session.user.id;

  const courseStats: CourseWithStats[] = courses.map((c) => {
    const confirmed = c.registrations.filter((r) => r.status === "CONFIRMED");
    const waitlist = c.registrations
      .filter((r) => r.status === "WAITLIST")
      .sort((a, b) => (a.waitlistOrder ?? 0) - (b.waitlistOrder ?? 0));

    const myReg =
      confirmed.find((r) => r.userId === userId) ??
      waitlist.find((r) => r.userId === userId) ??
      null;

    const myRank = myReg?.status === "CONFIRMED"
      ? confirmed.findIndex((r) => r.userId === userId) + 1
      : null;

    return {
      id: c.id,
      name: c.name,
      courseType: c.courseType,
      level: c.level,
      schedule: c.schedule,
      daysCount: c.daysCount,
      capacity: c.capacity,
      tuitionFee: c.tuitionFee,
      durationHours: null,
      instructor: c.instructor ?? null,
      instructorNameText: c.instructorNameText,
      confirmedCount: confirmed.length,
      waitlistCount: waitlist.length,
      myRegistration: myReg
        ? {
            id: myReg.id,
            status: myReg.status as "CONFIRMED" | "WAITLIST",
            waitlistOrder: myReg.waitlistOrder,
            myRank,
          }
        : null,
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">수강신청 시간표</h1>
        <span className="text-xs text-ink-muted">{yearMonth}</span>
      </div>
      <TimetableGrid initialCourses={courseStats} period={periodInfo} />
    </div>
  );
}
