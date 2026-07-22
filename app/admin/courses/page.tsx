import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAllConfig } from "@/lib/system-config";
import { CoursesPanel } from "@/components/admin/courses-panel";
import { SpecialCoursesPanel } from "@/components/admin/special-courses-panel";

export const dynamic = "force-dynamic";

const DEFAULT_LEVELS = ["입문", "Lev 0.5", "Lev 1", "Lev 1.5", "Lev 2", "Lev 2+", "Special", "파드되", "포인트"];

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { tab = "regular" } = await searchParams;

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [instructors, config] = await Promise.all([
    prisma.instructor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, themeColor: true },
    }),
    getAllConfig(),
  ]);

  const levels = config.course_levels
    ? config.course_levels.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_LEVELS;

  if (tab === "special") {
    const specialCourses = await prisma.specialCourse.findMany({
      where: { isActive: true },
      include: {
        instructor: { select: { id: true, name: true, themeColor: true } },
        _count: { select: { registrations: { where: { status: "CONFIRMED" } } } },
      },
      orderBy: { sessionAt: "desc" },
    });

    const specialData = specialCourses.map((c) => ({
      id: c.id,
      name: c.name,
      instructor: c.instructor ?? null,
      instructorNameText: c.instructorNameText,
      instructorContact: c.instructorContact,
      sessionAt: c.sessionAt.toISOString(),
      durationHours: Number(c.durationHours),
      level: c.level,
      hourlyRate: c.hourlyRate,
      tuitionFee: c.tuitionFee,
      instructorHourlyFee: c.instructorHourlyFee,
      instructorFee: c.instructorFee,
      capacity: c.capacity,
      description: c.description,
      confirmedCount: c._count.registrations,
    }));

    return (
      <div>
        <h1 className="text-xl font-bold mb-5">수업 관리</h1>
        <CourseTabs active="special" />
        <SpecialCoursesPanel initialCourses={specialData} instructors={instructors} />
      </div>
    );
  }

  const coursesRaw = await prisma.course.findMany({
    where: { yearMonth, isActive: true },
    include: {
      instructor: { select: { id: true, name: true, themeColor: true } },
      _count: { select: { registrations: { where: { status: "CONFIRMED" } } } },
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

  const courseData = courses.map((c) => ({
    id: c.id,
    name: c.name,
    courseType: c.courseType,
    level: c.level,
    schedule: c.schedule,
    daysCount: c.daysCount,
    capacity: c.capacity,
    tuitionFee: c.tuitionFee,
    instructorFee: c.instructorFee,
    tuitionFeeIsManual: c.tuitionFeeIsManual,
    confirmedCount: c._count.registrations,
    instructor: c.instructor ?? null,
    instructorNameText: c.instructorNameText,
  }));

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">수업 관리</h1>
      <CourseTabs active="regular" />
      <CoursesPanel yearMonth={yearMonth} initialCourses={courseData} instructors={instructors} levels={levels} />
    </div>
  );
}

function CourseTabs({ active }: { active: "regular" | "special" }) {
  return (
    <div className="flex gap-1 mb-5 border-b border-black/[0.08]">
      <a
        href="/admin/courses?tab=regular"
        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
          active === "regular"
            ? "border-ink text-ink"
            : "border-transparent text-ink-muted hover:text-ink"
        }`}
      >
        정규 수업
      </a>
      <a
        href="/admin/courses?tab=special"
        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
          active === "special"
            ? "border-ink text-ink"
            : "border-transparent text-ink-muted hover:text-ink"
        }`}
      >
        특별 수업
      </a>
    </div>
  );
}
