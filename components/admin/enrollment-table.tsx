"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CourseListCard } from "@/components/ui/course-list-card";

type PaymentStatus = "PENDING" | "PAID" | "UNPAID";

interface ConfirmedEntry {
  regId: string;
  userId: string;
  mateId: string | null;
  name: string;
  username: string;
  grade: "REGULAR" | "ASSOCIATE" | null;
  paymentStatus: PaymentStatus;
  clubFeePaymentStatus: PaymentStatus | null;
  registeredAt: string;
}

interface WaitlistEntry {
  regId: string;
  userId: string;
  mateId: string | null;
  order: number | null;
  name: string;
  username: string;
}

interface Course {
  id: string;
  name: string;
  courseType: string;
  level: string | null;
  schedule: string;
  capacity: number;
  tuitionFee: number;
  instructorThemeColor: string | null;
  instructorName: string;
  confirmedCount: number;
  waitlistCount: number;
  paidCount: number;
  unpaidCount: number;
  confirmed: ConfirmedEntry[];
  waitlist: WaitlistEntry[];
}

interface Period {
  id: string;
  openAt: string;
  closeAt: string;
  isActive: boolean;
}

interface Props {
  yearMonth: string;
  period: Period | null;
  courses: Course[];
}

const PAY_LABELS: Record<PaymentStatus, { label: string; cls: string }> = {
  PENDING: { label: "대기", cls: "text-yellow-600" },
  PAID:    { label: "완료", cls: "text-green-600" },
  UNPAID:  { label: "미완료", cls: "text-red-600" },
};

export function EnrollmentTable({ yearMonth, period: initialPeriod, courses: initialCourses }: Props) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [tab, setTab] = useState<"courses" | "members">("courses");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingRegId, setPendingRegId] = useState<string | null>(null);

  // ── 회원별 집계 ──────────────────────────────
  const memberRows = useMemo(() => {
    const map = new Map<string, {
      userId: string; mateId: string | null; name: string; username: string;
      grade: "REGULAR" | "ASSOCIATE" | null;
      regs: Array<{
        regId: string; courseId: string; courseName: string; courseLevel: string | null;
        schedule: string; instructorThemeColor: string | null;
        status: "confirmed" | "waitlist"; waitlistOrder: number | null;
        paymentStatus: PaymentStatus; clubFeePaymentStatus: PaymentStatus | null;
        tuitionFee: number;
      }>;
    }>();

    for (const c of courses) {
      for (const r of c.confirmed) {
        if (!map.has(r.userId)) {
          map.set(r.userId, { userId: r.userId, mateId: r.mateId, name: r.name, username: r.username, grade: r.grade, regs: [] });
        }
        map.get(r.userId)!.regs.push({
          regId: r.regId, courseId: c.id, courseName: c.name, courseLevel: c.level,
          schedule: c.schedule, instructorThemeColor: c.instructorThemeColor,
          status: "confirmed", waitlistOrder: null,
          paymentStatus: r.paymentStatus, clubFeePaymentStatus: r.clubFeePaymentStatus,
          tuitionFee: c.tuitionFee,
        });
      }
      for (const r of c.waitlist) {
        if (!map.has(r.userId)) {
          map.set(r.userId, { userId: r.userId, mateId: r.mateId, name: r.name, username: r.username, grade: null, regs: [] });
        }
        map.get(r.userId)!.regs.push({
          regId: r.regId, courseId: c.id, courseName: c.name, courseLevel: c.level,
          schedule: c.schedule, instructorThemeColor: c.instructorThemeColor,
          status: "waitlist", waitlistOrder: r.order,
          paymentStatus: "PENDING", clubFeePaymentStatus: null,
          tuitionFee: c.tuitionFee,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [courses]);

  // ── API 호출 헬퍼 ──────────────────────────────
  async function updatePayment(regId: string, courseId: string, type: "tuition" | "clubFee", status: PaymentStatus) {
    setPendingRegId(regId);
    try {
      await fetch(`/api/admin/registrations/${regId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, status }),
      });
      setCourses((prev) =>
        prev.map((c) =>
          c.id !== courseId ? c : {
            ...c,
            paidCount: type === "tuition" ? c.confirmed.filter((r) =>
              r.regId === regId ? status === "PAID" : r.paymentStatus === "PAID"
            ).length : c.paidCount,
            unpaidCount: type === "tuition" ? c.confirmed.filter((r) =>
              r.regId === regId ? status === "UNPAID" : r.paymentStatus === "UNPAID"
            ).length : c.unpaidCount,
            confirmed: c.confirmed.map((r) =>
              r.regId !== regId ? r : {
                ...r,
                paymentStatus: type === "tuition" ? status : r.paymentStatus,
                clubFeePaymentStatus: type === "clubFee" ? status : r.clubFeePaymentStatus,
              }
            ),
          }
        )
      );
    } finally {
      setPendingRegId(null);
    }
  }

  async function cancelReg(regId: string) {
    if (!confirm("수강신청을 취소하시겠습니까?")) return;
    setPendingRegId(regId);
    try {
      await fetch(`/api/admin/registrations/${regId}/cancel`, { method: "POST" });
      router.refresh();
    } finally {
      setPendingRegId(null);
    }
  }

  async function bulkPayment(regIds: string[], type: "tuition" | "clubFee", status: PaymentStatus) {
    setPendingRegId("__bulk__");
    try {
      await fetch("/api/admin/registrations/bulk-payment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regIds, type, status }),
      });
      setCourses((prev) =>
        prev.map((c) => ({
          ...c,
          confirmed: c.confirmed.map((r) =>
            regIds.includes(r.regId)
              ? {
                  ...r,
                  paymentStatus: type === "tuition" ? status : r.paymentStatus,
                  clubFeePaymentStatus: type === "clubFee" ? status : r.clubFeePaymentStatus,
                }
              : r
          ),
          paidCount: type === "tuition"
            ? c.confirmed.filter((r) => regIds.includes(r.regId) ? status === "PAID" : r.paymentStatus === "PAID").length
            : c.paidCount,
          unpaidCount: type === "tuition"
            ? c.confirmed.filter((r) => regIds.includes(r.regId) ? status === "UNPAID" : r.paymentStatus === "UNPAID").length
            : c.unpaidCount,
        }))
      );
    } finally {
      setPendingRegId(null);
    }
  }

  // ── 수업별 탭 렌더 ──────────────────────────────
  function renderCourses() {
    return (
      <div className="space-y-3">
        {courses.map((course) => {
          const isExpanded = expandedId === course.id;
          return (
            <CourseListCard
              key={course.id}
              name={course.name}
              courseType={course.courseType}
              level={course.level}
              schedule={course.schedule}
              themeColor={course.instructorThemeColor}
              instructorName={course.instructorName}
              confirmedCount={course.confirmedCount}
              capacity={course.capacity}
              waitlistCount={course.waitlistCount}
              paidCount={course.paidCount}
              unpaidCount={course.unpaidCount}
              onClick={() => setExpandedId(isExpanded ? null : course.id)}
              trailing={
                <svg
                  className={`w-4 h-4 text-ink-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              }
            >
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-black/10">
                  <p className="text-[10px] font-bold text-ink-muted tracking-wider mb-2">
                    확정 명단 ({course.confirmedCount}명)
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-ink-muted border-b border-black/10">
                          <th className="text-left pb-1.5 pr-3 font-medium">#</th>
                          <th className="text-left pb-1.5 pr-3 font-medium">이름</th>
                          <th className="text-left pb-1.5 pr-3 font-medium">등급</th>
                          <th className="text-left pb-1.5 pr-3 font-medium">수강료</th>
                          <th className="text-left pb-1.5 pr-3 font-medium">동호회비</th>
                          <th className="text-left pb-1.5 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {course.confirmed.map((r, i) => (
                          <tr key={r.regId} className="border-b border-black/5 last:border-0">
                            <td className="py-1.5 pr-3 text-ink-muted">{i + 1}</td>
                            <td className="py-1.5 pr-3">
                              {r.mateId ? (
                                <a
                                  href={`https://adagio.studiomate.kr/users/detail?id=${r.mateId}`}
                                  onClick={(e) => { e.preventDefault(); window.open(`https://adagio.studiomate.kr/users/detail?id=${r.mateId}`, "sm_member", "noopener,noreferrer,width=1280,height=900"); }}
                                  className="font-medium text-accent hover:underline cursor-pointer"
                                >
                                  {r.name}
                                </a>
                              ) : (
                                <span className="font-medium text-ink">{r.name}</span>
                              )}
                              <span className="text-ink-muted ml-1">{r.username}</span>
                            </td>
                            <td className="py-1.5 pr-3 text-ink-muted">
                              {r.grade === "REGULAR" ? "정회원" : r.grade === "ASSOCIATE" ? "준회원" : "—"}
                            </td>
                            <td className="py-1.5 pr-3">
                              <select
                                value={r.paymentStatus}
                                disabled={pendingRegId === r.regId}
                                onChange={(e) => updatePayment(r.regId, course.id, "tuition", e.target.value as PaymentStatus)}
                                className={`text-xs border-0 bg-transparent font-medium cursor-pointer ${PAY_LABELS[r.paymentStatus].cls}`}
                              >
                                <option value="PENDING">대기</option>
                                <option value="PAID">완료</option>
                                <option value="UNPAID">미완료</option>
                              </select>
                            </td>
                            <td className="py-1.5 pr-3">
                              {r.grade === "ASSOCIATE" && r.clubFeePaymentStatus ? (
                                <select
                                  value={r.clubFeePaymentStatus}
                                  disabled={pendingRegId === r.regId}
                                  onChange={(e) => updatePayment(r.regId, course.id, "clubFee", e.target.value as PaymentStatus)}
                                  className={`text-xs border-0 bg-transparent font-medium cursor-pointer ${PAY_LABELS[r.clubFeePaymentStatus].cls}`}
                                >
                                  <option value="PENDING">대기</option>
                                  <option value="PAID">완료</option>
                                  <option value="UNPAID">미완료</option>
                                </select>
                              ) : (
                                <span className="text-ink-muted">—</span>
                              )}
                            </td>
                            <td className="py-1.5">
                              <button
                                onClick={() => cancelReg(r.regId)}
                                disabled={pendingRegId === r.regId}
                                className="text-[10px] text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                              >
                                취소
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {course.waitlist.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-bold text-ink-muted tracking-wider mb-1.5">
                        후보 ({course.waitlist.length}명)
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {course.waitlist.map((r) => (
                          <span key={r.regId} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">
                            {r.order}번 {r.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CourseListCard>
          );
        })}
      </div>
    );
  }

  // ── 회원별 탭 렌더 ──────────────────────────────
  function renderMembers() {
    if (memberRows.length === 0) {
      return <p className="text-sm text-ink-muted text-center py-12">신청자가 없습니다.</p>;
    }
    return (
      <div className="space-y-2">
        {memberRows.map((m) => {
          const isExpanded = expandedId === m.userId;
          const confirmedRegs = m.regs.filter((r) => r.status === "confirmed");
          const waitlistRegs = m.regs.filter((r) => r.status === "waitlist");
          const totalTuition = confirmedRegs.reduce((s, r) => s + r.tuitionFee, 0);
          const confirmedRegIds = confirmedRegs.map((r) => r.regId);
          const isBulkPending = pendingRegId === "__bulk__";
          const smUrl = m.mateId ? `https://adagio.studiomate.kr/users/detail?id=${m.mateId}` : null;
          const anyUnpaid = confirmedRegs.some((r) => r.paymentStatus === "UNPAID");
          const hasOutstanding = confirmedRegs.some((r) => r.paymentStatus !== "PAID");

          return (
            <div key={m.userId} className="card">
              {/* 헤더 */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : m.userId)}
                  className="flex-1 flex items-start gap-2 text-left min-w-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {smUrl ? (
                        <a
                          href={smUrl}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(smUrl, "sm_member", "noopener,noreferrer,width=1280,height=900"); }}
                          className="text-sm font-bold text-accent hover:underline cursor-pointer"
                        >
                          {m.name}
                        </a>
                      ) : (
                        <span className="text-sm font-bold text-ink">{m.name}</span>
                      )}
                      <span className="text-xs text-ink-muted">{m.username}</span>
                      {m.grade && (
                        <span className="text-[10px] bg-surface-1 text-ink-muted px-1.5 py-0.5 rounded-full">
                          {m.grade === "REGULAR" ? "정회원" : "준회원"}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-ink-muted mt-0.5">
                      확정 {confirmedRegs.length}개
                      {waitlistRegs.length > 0 && ` · 후보 ${waitlistRegs.length}개`}
                      {totalTuition > 0 && ` · 합계 ${totalTuition.toLocaleString()}원`}
                    </p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-ink-muted transition-transform flex-none mt-0.5 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* 입금 상태 버튼 */}
                {hasOutstanding && confirmedRegIds.length > 0 && (
                  <button
                    onClick={() => bulkPayment(confirmedRegIds, "tuition", "PAID")}
                    disabled={isBulkPending}
                    className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors flex-none border ${
                      anyUnpaid
                        ? "text-red-700 bg-red-50 hover:bg-red-100 border-red-200"
                        : "text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
                    }`}
                  >
                    {isBulkPending ? "..." : "입금 미완료"}
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-black/10 space-y-2">
                  {m.regs.map((r) => {
                    const color = r.instructorThemeColor ?? "#9ca3af";
                    return (
                      <div
                        key={r.regId}
                        className="rounded-lg px-3 py-2 bg-surface-1 flex items-center justify-between gap-2"
                        // style={{ borderLeft: `3px solid ${color}` }}
                      >
                        <div className="flex items-stretch justify-between gap-3">
                        <div
                          className="w-1 rounded-full flex-none"
                          style={{ backgroundColor: color }}
                        />

                          
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-ink">{r.courseName}</span>
                            {r.courseLevel && (
                              <span className="text-[10px] text-ink-muted bg-white/60 px-1 py-0.5 rounded">
                                {r.courseLevel}
                              </span>
                            )}
                            <span className="text-[10px] text-ink-muted">{r.schedule}</span>
                          </div>
                        </div>
                        </div>

                        <div className="flex items-center gap-2 flex-none">
                          {r.status === "confirmed" ? (
                            <>
                              <select
                                value={r.paymentStatus}
                                disabled={isBulkPending || pendingRegId === r.regId}
                                onChange={(e) => updatePayment(r.regId, r.courseId, "tuition", e.target.value as PaymentStatus)}
                                className={`text-[10px] border border-black/10 bg-white rounded px-1.5 py-0.5 font-medium cursor-pointer ${PAY_LABELS[r.paymentStatus].cls}`}
                              >
                                <option value="PENDING">입금 대기</option>
                                <option value="PAID">입금 완료</option>
                                <option value="UNPAID">입금 미완료</option>
                              </select>
                              {m.grade === "ASSOCIATE" && r.clubFeePaymentStatus !== null && (
                                <select
                                  value={r.clubFeePaymentStatus ?? "PENDING"}
                                  disabled={isBulkPending || pendingRegId === r.regId}
                                  onChange={(e) => updatePayment(r.regId, r.courseId, "clubFee", e.target.value as PaymentStatus)}
                                  className={`text-[10px] border border-black/10 bg-white rounded px-1.5 py-0.5 font-medium cursor-pointer ${PAY_LABELS[r.clubFeePaymentStatus ?? "PENDING"].cls}`}
                                >
                                  <option value="PENDING">동호회비 대기</option>
                                  <option value="PAID">동호회비 완료</option>
                                  <option value="UNPAID">동호회비 미완료</option>
                                </select>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
                              후보 {r.waitlistOrder}번
                            </span>
                          )}
                          <button
                            onClick={() => cancelReg(r.regId)}
                            disabled={pendingRegId === r.regId || isBulkPending}
                            className="text-[10px] text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-100 transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 수강신청 기간 요약 */}
      {initialPeriod && (
        <div className="card flex items-center justify-between text-xs">
          <span className="text-ink-secondary">
            수강신청 기간: {new Date(initialPeriod.openAt).toLocaleString("ko-KR")} ~{" "}
            {new Date(initialPeriod.closeAt).toLocaleString("ko-KR")}
          </span>
          <span className={`font-bold ${initialPeriod.isActive ? "text-green-600" : "text-ink-muted"}`}>
            {initialPeriod.isActive ? "● 활성" : "● 비활성"}
          </span>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1">
        {(["courses", "members"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setExpandedId(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-ink text-white" : "bg-surface-1 text-ink-secondary hover:bg-black/10"
            }`}
          >
            {t === "courses" ? "수업별" : "회원별"}
          </button>
        ))}
      </div>

      {tab === "courses" ? renderCourses() : renderMembers()}
    </div>
  );
}
