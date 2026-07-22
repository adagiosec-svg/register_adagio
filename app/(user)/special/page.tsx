import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SpecialCourseList } from "@/components/special/special-course-list";

export const dynamic = "force-dynamic";

export default async function SpecialPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;

  const courses = await prisma.specialCourse.findMany({
    where: { isActive: true, sessionAt: { gte: new Date() } },
    include: {
      registrations: {
        where: { status: { in: ["CONFIRMED", "WAITLIST"] } },
        select: { id: true, userId: true, status: true, waitlistOrder: true },
      },
    },
    orderBy: { sessionAt: "asc" },
  });

  const result = courses.map((c) => {
    const confirmed = c.registrations.filter((r) => r.status === "CONFIRMED");
    const waitlist = c.registrations
      .filter((r) => r.status === "WAITLIST")
      .sort((a, b) => (a.waitlistOrder ?? 0) - (b.waitlistOrder ?? 0));

    const myReg =
      confirmed.find((r) => r.userId === userId) ??
      waitlist.find((r) => r.userId === userId) ??
      null;

    return {
      id: c.id,
      name: c.name,
      instructorNameText: c.instructorNameText,
      sessionAt: c.sessionAt.toISOString(),
      durationHours: Number(c.durationHours),
      level: c.level,
      tuitionFee: c.tuitionFee,
      capacity: c.capacity,
      description: c.description,
      confirmedCount: confirmed.length,
      waitlistCount: waitlist.length,
      myRegistration: myReg
        ? {
            id: myReg.id,
            status: myReg.status as "CONFIRMED" | "WAITLIST",
            waitlistOrder: myReg.waitlistOrder,
          }
        : null,
    };
  });

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Special 수업</h1>
      <SpecialCourseList initialCourses={result} />
    </div>
  );
}
