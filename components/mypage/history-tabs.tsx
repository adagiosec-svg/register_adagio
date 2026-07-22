"use client";

import { useState } from "react";
import type { CourseType, FinalStatus, PaymentStatus } from "@prisma/client";
import { CourseListCard } from "@/components/ui/course-list-card";

interface RegularReg {
  id: string;
  status: "CONFIRMED" | "WAITLIST" | "CANCELLED";
  paymentStatus: PaymentStatus;
  courseName: string;
  courseType: CourseType;
  level: string | null;
  schedule: string;
  tuitionFee: number;
  instructorName: string | null;
  instructorThemeColor: string | null;
  registeredAt: string;
  yearMonth: string;
}

interface SpecialReg {
  id: string;
  status: "CONFIRMED" | "WAITLIST" | "CANCELLED";
  courseName: string;
  sessionAt: string;
  tuitionFee: number;
  instructorNameText: string | null;
  registeredAt: string;
}

interface EnrollHistory {
  id: string;
  courseName: string;
  courseType: CourseType;
  finalStatus: FinalStatus;
  tuitionPaymentStatus: PaymentStatus;
  tuitionFee: number;
  confirmedAt: string;
  yearMonth: string;
}

interface Props {
  currentRegs: RegularReg[];
  specialRegs: SpecialReg[];
  history: EnrollHistory[];
}

type Tab = "current" | "special" | "history";

const TAB_LABELS: Record<Tab, string> = {
  current: "이번달 신청",
  special: "Special",
  history: "과거 내역",
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: "확정", cls: "badge-green" },
  WAITLIST: { label: "후보", cls: "badge-yellow" },
  CANCELLED: { label: "취소", cls: "bg-surface-1 text-ink-muted" },
};

const FINAL_STATUS_LABELS: Record<FinalStatus, { label: string; cls: string }> = {
  CONFIRMED: { label: "수강 완료", cls: "badge-green" },
  CANCELLED: { label: "취소", cls: "bg-surface-1 text-ink-muted" },
  PAYMENT_FAILED: { label: "입금 미완료", cls: "bg-red-100 text-red-700" },
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  PENDING: "입금 대기",
  PAID: "입금 완료",
  UNPAID: "입금 미완료",
};

export function HistoryTabs({ currentRegs, specialRegs, history }: Props) {
  const [tab, setTab] = useState<Tab>("current");

  return (
    <div>
      {/* 탭 헤더 */}
      <div className="flex gap-1 mb-4 bg-surface-1 rounded-xl p-1">
        {(["current", "special", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === t ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* 이번달 정규 신청 */}
      {tab === "current" && (
        <div className="space-y-2">
          {currentRegs.length === 0 ? (
            <div className="card text-center py-10 text-ink-muted text-sm">
              이번달 신청 내역이 없습니다.
            </div>
          ) : (
            currentRegs.map((reg) => {
              const st = STATUS_LABELS[reg.status];
              return (
                <CourseListCard
                  key={reg.id}
                  name={reg.courseName}
                  courseType={reg.courseType}
                  level={reg.level}
                  schedule={`${reg.yearMonth} · ${reg.schedule}`}
                  themeColor={reg.instructorThemeColor}
                  trailing={
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                  }
                >
                  {reg.status === "CONFIRMED" && (
                    <div className="mt-2 pt-2 border-t border-black/5 space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-ink-secondary">수강료</span>
                        <span className="font-medium text-ink">{reg.tuitionFee.toLocaleString()}원</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-ink-secondary">입금 상태</span>
                        <span
                          className={`font-medium ${
                            reg.paymentStatus === "PAID"
                              ? "text-green-600"
                              : reg.paymentStatus === "UNPAID"
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {PAYMENT_LABELS[reg.paymentStatus]}
                        </span>
                      </div>
                    </div>
                  )}
                </CourseListCard>
              );
            })
          )}
        </div>
      )}

      {/* Special 신청 */}
      {tab === "special" && (
        <div className="space-y-2">
          {specialRegs.length === 0 ? (
            <div className="card text-center py-10 text-ink-muted text-sm">
              Special 수업 신청 내역이 없습니다.
            </div>
          ) : (
            specialRegs.map((reg) => {
              const st = STATUS_LABELS[reg.status];
              const dateLabel = new Date(reg.sessionAt).toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "short",
              });
              return (
                <CourseListCard
                  key={reg.id}
                  name={reg.courseName}
                  courseType="SPECIAL"
                  schedule={reg.instructorNameText ? `${dateLabel} · ${reg.instructorNameText}` : dateLabel}
                  trailing={
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                  }
                >
                  <div className="mt-2 pt-2 border-t border-black/5">
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-secondary">수강료</span>
                      <span className="font-medium text-ink">{reg.tuitionFee.toLocaleString()}원</span>
                    </div>
                  </div>
                </CourseListCard>
              );
            })
          )}
        </div>
      )}

      {/* 과거 내역 (EnrollmentHistory) */}
      {tab === "history" && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="card text-center py-10 text-ink-muted text-sm">
              과거 수강 내역이 없습니다.
            </div>
          ) : (
            history.map((h) => {
              const fs = FINAL_STATUS_LABELS[h.finalStatus];
              return (
                <CourseListCard
                  key={h.id}
                  name={h.courseName}
                  courseType={h.courseType}
                  schedule={h.yearMonth}
                  trailing={
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${fs.cls}`}>
                      {fs.label}
                    </span>
                  }
                >
                  {h.finalStatus === "CONFIRMED" && (
                    <div className="mt-2 pt-2 border-t border-black/5">
                      <div className="flex justify-between text-xs">
                        <span className="text-ink-secondary">수강료</span>
                        <span className="font-medium text-ink">{h.tuitionFee.toLocaleString()}원</span>
                      </div>
                    </div>
                  )}
                </CourseListCard>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
