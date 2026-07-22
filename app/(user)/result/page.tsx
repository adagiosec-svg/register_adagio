import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAllConfig } from "@/lib/system-config";
import { ResultView } from "@/components/registration/result-view";
import type { RegistrationResult, SystemConfigMap } from "@/types/api";

type UserGrade = "REGULAR" | "ASSOCIATE";

export const dynamic = "force-dynamic";

export default async function ResultPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // 활성 기간
  const period = await prisma.registrationPeriod.findFirst({
    where: { isActive: true },
    orderBy: { openAt: "desc" },
  });
  if (!period) {
    return (
      <div>
        <h1 className="text-xl font-bold mb-5">수강신청 결과</h1>
        <div className="card text-center py-16 text-ink-muted text-sm">
          진행 중인 수강신청 기간이 없습니다.
        </div>
      </div>
    );
  }

  const userId = session.user.id;

  // 내 신청 내역
  const myRegs = await prisma.registration.findMany({
    where: {
      userId,
      status: { in: ["CONFIRMED", "WAITLIST"] },
      course: { yearMonth: period.yearMonth },
    },
    include: {
      course: { include: { instructor: { select: { name: true, themeColor: true } } } },
    },
    orderBy: { registeredAt: "asc" },
  });

  // 사용자 grade
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { grade: true },
  });
  const grade = (user?.grade ?? "REGULAR") as UserGrade;

  const results: RegistrationResult[] = await Promise.all(
    myRegs.map(async (reg) => {
      const courseId = reg.courseId;

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
          isMe: r.userId === userId,
        }));

      const waitlistList = allRegs
        .filter((r) => r.status === "WAITLIST")
        .sort((a, b) => (a.waitlistOrder ?? 0) - (b.waitlistOrder ?? 0))
        .map((r) => ({
          order: r.waitlistOrder ?? 0,
          name: r.user.name,
          registeredAt: r.registeredAt.toISOString(),
          isMe: r.userId === userId,
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

  const config = (await getAllConfig()) as unknown as SystemConfigMap;

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">수강신청 결과</h1>
      <ResultView results={results} grade={grade} config={config} />
    </div>
  );
}
