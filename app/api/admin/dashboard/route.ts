import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const yearMonth =
    searchParams.get("yearMonth") ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 수업 목록 (FULL/HALF)
  const courses = await prisma.course.findMany({
    where: { yearMonth, courseType: { in: ["FULL", "HALF"] }, isActive: true },
    include: {
      instructor: { select: { name: true } },
      registrations: {
        where: { status: { in: ["CONFIRMED", "WAITLIST"] } },
        include: { user: { select: { name: true, username: true, grade: true } } },
        orderBy: { registeredAt: "asc" },
      },
    },
    orderBy: { schedule: "asc" },
  });

  const result = courses.map((c) => {
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
      instructorName: c.instructor?.name ?? c.instructorNameText ?? "—",
      confirmedCount: confirmed.length,
      waitlistCount: waitlist.length,
      paidCount: confirmed.filter((r) => r.paymentStatus === "PAID").length,
      unpaidCount: confirmed.filter((r) => r.paymentStatus === "UNPAID").length,
      confirmed: confirmed.map((r) => ({
        regId: r.id,
        name: r.user.name,
        username: r.user.username,
        grade: r.user.grade,
        paymentStatus: r.paymentStatus,
        clubFeePaymentStatus: r.clubFeePaymentStatus,
        registeredAt: r.registeredAt.toISOString(),
      })),
      waitlist: waitlist.map((r) => ({
        regId: r.id,
        order: r.waitlistOrder,
        name: r.user.name,
        username: r.user.username,
      })),
    };
  });

  // 수강신청 기간
  const period = await prisma.registrationPeriod.findFirst({
    where: { yearMonth, isActive: true },
    orderBy: { openAt: "desc" },
  });

  return NextResponse.json({
    yearMonth,
    period: period
      ? {
          id: period.id,
          openAt: period.openAt.toISOString(),
          closeAt: period.closeAt.toISOString(),
          isActive: period.isActive,
        }
      : null,
    courses: result,
  });
}
