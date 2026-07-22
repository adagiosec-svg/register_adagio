import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const registrations = await prisma.registration.findMany({
    where: {
      userId: id,
      status: { in: ["CONFIRMED", "WAITLIST"] },
      course: { yearMonth },
    },
    include: {
      course: {
        select: { name: true, schedule: true, courseType: true, level: true, tuitionFee: true },
      },
    },
    orderBy: { registeredAt: "asc" },
  });

  const specialRegistrations = await prisma.specialRegistration.findMany({
    where: {
      userId: id,
      status: { in: ["CONFIRMED", "WAITLIST"] },
      specialCourse: { sessionAt: { gte: monthStart, lt: monthEnd } },
    },
    include: {
      specialCourse: {
        select: { name: true, sessionAt: true, tuitionFee: true },
      },
    },
    orderBy: { registeredAt: "asc" },
  });

  return NextResponse.json({
    yearMonth,
    regular: registrations.map((r) => ({
      id: r.id,
      status: r.status,
      waitlistOrder: r.waitlistOrder,
      paymentStatus: r.paymentStatus,
      registeredAt: r.registeredAt.toISOString(),
      course: r.course,
    })),
    special: specialRegistrations.map((r) => ({
      id: r.id,
      status: r.status,
      waitlistOrder: r.waitlistOrder,
      paymentStatus: r.paymentStatus,
      registeredAt: r.registeredAt.toISOString(),
      specialCourse: r.specialCourse,
    })),
  });
}
