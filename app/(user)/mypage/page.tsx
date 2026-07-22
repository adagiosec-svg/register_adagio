import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decryptPhone } from "@/lib/crypto";
import { HistoryTabs } from "@/components/mypage/history-tabs";
import { PasswordChangeForm } from "@/components/mypage/password-change-form";

export const dynamic = "force-dynamic";

export default async function MypagePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;

  // 이번달 활성 기간
  const period = await prisma.registrationPeriod.findFirst({
    where: { isActive: true },
    orderBy: { openAt: "desc" },
  });

  // 이번달 정규 신청 (취소 포함)
  const currentRegs = period
    ? await prisma.registration.findMany({
        where: { userId, course: { yearMonth: period.yearMonth } },
        include: {
          course: {
            select: {
              name: true,
              courseType: true,
              level: true,
              schedule: true,
              tuitionFee: true,
              yearMonth: true,
              instructor: { select: { name: true, themeColor: true } },
            },
          },
        },
        orderBy: { registeredAt: "desc" },
      })
    : [];

  // Special 수업 신청 내역 (취소 포함, 최근 6개월)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const specialRegs = await prisma.specialRegistration.findMany({
    where: { userId, registeredAt: { gte: sixMonthsAgo } },
    include: {
      specialCourse: {
        select: { name: true, sessionAt: true, tuitionFee: true, instructorNameText: true },
      },
    },
    orderBy: { registeredAt: "desc" },
  });

  // 과거 수강 히스토리 (2년치, 최신순)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const history = await prisma.enrollmentHistory.findMany({
    where: { userId, confirmedAt: { gte: twoYearsAgo } },
    orderBy: { confirmedAt: "desc" },
    take: 50,
  });

  // 직렬화
  const serializedCurrentRegs = currentRegs.map((r) => ({
    id: r.id,
    status: r.status as "CONFIRMED" | "WAITLIST" | "CANCELLED",
    paymentStatus: r.paymentStatus,
    courseName: r.course.name,
    courseType: r.course.courseType,
    level: r.course.level,
    schedule: r.course.schedule,
    tuitionFee: r.course.tuitionFee,
    instructorName: r.course.instructor?.name ?? null,
    instructorThemeColor: r.course.instructor?.themeColor ?? null,
    registeredAt: r.registeredAt.toISOString(),
    yearMonth: r.course.yearMonth,
  }));

  const serializedSpecial = specialRegs.map((r) => ({
    id: r.id,
    status: r.status as "CONFIRMED" | "WAITLIST" | "CANCELLED",
    courseName: r.specialCourse.name,
    sessionAt: r.specialCourse.sessionAt.toISOString(),
    tuitionFee: r.specialCourse.tuitionFee,
    instructorNameText: r.specialCourse.instructorNameText,
    registeredAt: r.registeredAt.toISOString(),
  }));

  const serializedHistory = history.map((h) => ({
    id: h.id,
    courseName: h.courseName,
    courseType: h.courseType,
    finalStatus: h.finalStatus,
    tuitionPaymentStatus: h.tuitionPaymentStatus,
    tuitionFee: h.tuitionFee,
    confirmedAt: h.confirmedAt.toISOString(),
    yearMonth: h.yearMonth,
  }));

  // 사용자 정보 (전화번호 포함)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true, grade: true, phoneEncrypted: true },
  });

  const phone = user?.phoneEncrypted ? decryptPhone(user.phoneEncrypted) : null;

  return (
    <div>
      {/* 내 정보 요약 */}
      <div className="card mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-ink">{user?.name ?? "—"}</p>
            <p className="text-xs text-ink-muted mt-0.5">
              {user?.username} · {user?.grade === "REGULAR" ? "정회원" : "준회원"}
            </p>
          </div>
          {phone && (
            <div className="text-right">
              <p className="text-[10px] text-ink-muted">전화번호</p>
              <p className="text-sm font-medium text-ink">{phone}</p>
            </div>
          )}
        </div>
      </div>

      <PasswordChangeForm />

      <h1 className="text-xl font-bold mb-4 mt-6">나의 신청 내역</h1>
      <HistoryTabs
        currentRegs={serializedCurrentRegs}
        specialRegs={serializedSpecial}
        history={serializedHistory}
      />
    </div>
  );
}
