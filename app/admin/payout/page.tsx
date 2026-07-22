import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decryptSensitiveOptional } from "@/lib/crypto";
import { PayoutPanel } from "@/components/admin/payout-panel";

export const dynamic = "force-dynamic";

export default async function PayoutPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const courses = await prisma.course.findMany({
    where: { yearMonth, isActive: true, instructorId: { not: null } },
    include: {
      instructor: true,
      _count: { select: { registrations: { where: { status: "CONFIRMED" } } } },
    },
    orderBy: { schedule: "asc" },
  });

  const map = new Map<string, {
    instructor: NonNullable<(typeof courses)[0]["instructor"]>;
    courses: { name: string; schedule: string; confirmedCount: number; instructorFee: number }[];
    totalFee: number;
    subsidy: number;
  }>();

  for (const c of courses) {
    if (!c.instructor) continue;
    const key = c.instructor.id;
    if (!map.has(key)) {
      map.set(key, { instructor: c.instructor, courses: [], totalFee: 0, subsidy: c.instructor.subsidyAmount });
    }
    const entry = map.get(key)!;
    const cnt = c._count.registrations;
    entry.courses.push({ name: c.name, schedule: c.schedule, confirmedCount: cnt, instructorFee: c.instructorFee });
    if (cnt > 0) entry.totalFee += c.instructorFee;
  }

  const rows = Array.from(map.values()).map((e) => {
    const hasCourse = e.courses.some((c) => c.confirmedCount > 0);
    const subsidy = hasCourse ? e.subsidy : 0;
    return {
      instructorId: e.instructor.id,
      instructorName: e.instructor.name,
      themeColor: e.instructor.themeColor,
      bankName: decryptSensitiveOptional(e.instructor.bankName),
      accountNumber: decryptSensitiveOptional(e.instructor.accountNumber),
      accountHolder: decryptSensitiveOptional(e.instructor.accountHolder),
      subsidyAmount: e.instructor.subsidyAmount,
      courses: e.courses,
      totalFee: e.totalFee,
      subsidy,
      total: e.totalFee + subsidy,
    };
  });

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  // 정산 현황 로드
  const payoutKey = `payout_status_${yearMonth}`;
  const payoutRow = await prisma.systemConfig.findUnique({ where: { key: payoutKey } });
  const payoutStatus: Record<string, boolean> = payoutRow ? JSON.parse(payoutRow.value) : {};

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">강사 정산</h1>
        <span className="text-xs text-ink-muted">{yearMonth}</span>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center py-16 text-ink-muted text-sm">이번달 강사 정산 데이터가 없습니다.</div>
      ) : (
        <PayoutPanel
          yearMonth={yearMonth}
          rows={rows}
          grandTotal={grandTotal}
          initialPayoutStatus={payoutStatus}
        />
      )}
    </div>
  );
}
