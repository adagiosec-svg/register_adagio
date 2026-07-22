import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EnrollmentTable } from "@/components/admin/enrollment-table";
import { RegistrationPeriodForm } from "@/components/admin/registration-period-form";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const period = await prisma.registrationPeriod.findFirst({
    where: { yearMonth, isActive: true },
    orderBy: { openAt: "desc" },
  });

  const coursesRaw = await prisma.course.findMany({
    where: { yearMonth, courseType: { in: ["FULL", "HALF"] }, isActive: true },
    include: {
      instructor: { select: { name: true, themeColor: true } },
      registrations: {
        where: { status: { in: ["CONFIRMED", "WAITLIST"] } },
        include: { user: { select: { id: true, name: true, username: true, grade: true, mateId: true } } },
        orderBy: { registeredAt: "asc" },
      },
    },
  });

  const DAY_ORDER: Record<string, number> = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4, 토: 5, 일: 6 };
  const courses = coursesRaw.sort((a, b) => {
    const da = DAY_ORDER[a.schedule[0]] ?? 7;
    const db = DAY_ORDER[b.schedule[0]] ?? 7;
    if (da !== db) return da - db;
    const ta = a.schedule.match(/\d{2}:\d{2}/)?.[0] ?? "";
    const tb = b.schedule.match(/\d{2}:\d{2}/)?.[0] ?? "";
    return ta.localeCompare(tb);
  });

  const courseData = courses.map((c) => {
    const confirmed = c.registrations.filter((r) => r.status === "CONFIRMED");
    const waitlist = c.registrations
      .filter((r) => r.status === "WAITLIST")
      .sort((a, b) => (a.waitlistOrder ?? 0) - (b.waitlistOrder ?? 0));

    return {
      id: c.id,
      name: c.name,
      courseType: c.courseType,
      level: c.level,
      schedule: c.schedule,
      capacity: c.capacity,
      tuitionFee: c.tuitionFee,
      instructorThemeColor: c.instructor?.themeColor ?? null,
      instructorName: c.instructor?.name ?? c.instructorNameText ?? "—",
      confirmedCount: confirmed.length,
      waitlistCount: waitlist.length,
      paidCount: confirmed.filter((r) => r.paymentStatus === "PAID").length,
      unpaidCount: confirmed.filter((r) => r.paymentStatus === "UNPAID").length,
      confirmed: confirmed.map((r) => ({
        regId: r.id,
        userId: r.user.id,
        mateId: r.user.mateId,
        name: r.user.name,
        username: r.user.username,
        grade: r.user.grade,
        paymentStatus: r.paymentStatus,
        clubFeePaymentStatus: r.clubFeePaymentStatus,
        registeredAt: r.registeredAt.toISOString(),
      })),
      waitlist: waitlist.map((r) => ({
        regId: r.id,
        userId: r.user.id,
        mateId: r.user.mateId,
        order: r.waitlistOrder,
        name: r.user.name,
        username: r.user.username,
      })),
    };
  });

  const periodInfo = period
    ? {
        id: period.id,
        openAt: period.openAt.toISOString(),
        closeAt: period.closeAt.toISOString(),
        isActive: period.isActive,
      }
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">수강신청 현황</h1>
        <span className="text-xs text-ink-muted">{yearMonth}</span>
      </div>
      <RegistrationPeriodForm yearMonth={yearMonth} initialPeriod={periodInfo} />
      <EnrollmentTable yearMonth={yearMonth} period={periodInfo} courses={courseData} />
    </div>
  );
}
