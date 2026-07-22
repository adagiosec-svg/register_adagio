"use client";

import { useState } from "react";

interface InstructorRow {
  instructorId: string;
  instructorName: string;
  themeColor: string;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  subsidyAmount: number;
  courses: { name: string; schedule: string; confirmedCount: number; instructorFee: number }[];
  totalFee: number;
  subsidy: number;
  total: number;
}

interface Props {
  yearMonth: string;
  rows: InstructorRow[];
  grandTotal: number;
  initialPayoutStatus: Record<string, boolean>;
}

export function PayoutPanel({ yearMonth, rows, grandTotal, initialPayoutStatus }: Props) {
  const [payoutStatus, setPayoutStatus] = useState<Record<string, boolean>>(initialPayoutStatus);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function togglePayout(instructorId: string) {
    const newValue = !payoutStatus[instructorId];
    setPendingId(instructorId);
    try {
      await fetch("/api/admin/payout/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearMonth, instructorId, paid: newValue }),
      });
      setPayoutStatus((prev) => ({ ...prev, [instructorId]: newValue }));
    } finally {
      setPendingId(null);
    }
  }

  const paidCount = rows.filter((r) => payoutStatus[r.instructorId]).length;

  return (
    <div className="space-y-3">
      {/* 정산 진행 요약 */}
      <div className="card flex items-center justify-between text-sm">
        <span className="text-ink-secondary">
          정산 완료 <span className="font-bold text-ink">{paidCount}</span> / {rows.length}명
        </span>
        <span className="text-xs text-ink-muted">{yearMonth}</span>
      </div>

      {rows.map((row) => {
        const isPaid = payoutStatus[row.instructorId] ?? false;
        const isPending = pendingId === row.instructorId;

        return (
          <div
            key={row.instructorId}
            className="card"
            style={{ borderLeft: `3px solid ${row.themeColor}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-none" style={{ backgroundColor: row.themeColor }} />
                <span className="text-sm font-bold text-ink">{row.instructorName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-ink">{row.total.toLocaleString()}원</span>
                <button
                  onClick={() => togglePayout(row.instructorId)}
                  disabled={isPending}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    isPaid
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-surface-1 text-ink-muted hover:bg-black/10"
                  }`}
                >
                  {isPending ? "..." : isPaid ? "✓ 정산 완료" : "정산 대기"}
                </button>
              </div>
            </div>

            {/* 수업별 내역 */}
            <div className="space-y-1 mb-3">
              {row.courses.map((c, i) => (
                <div key={i} className="flex justify-between text-xs text-ink-secondary">
                  <span>
                    {c.name} ({c.schedule}) · 수강생 {c.confirmedCount}명
                  </span>
                  <span className={c.confirmedCount === 0 ? "text-ink-muted line-through" : ""}>
                    {c.instructorFee.toLocaleString()}원
                  </span>
                </div>
              ))}
              {row.subsidy > 0 && (
                <div className="flex justify-between text-xs text-blue-600">
                  <span>월 지원금</span>
                  <span>{row.subsidy.toLocaleString()}원</span>
                </div>
              )}
            </div>

            {/* 계좌 정보 */}
            {row.accountNumber && (
              <div className="pt-2 border-t border-black/10 text-xs text-ink-muted">
                {row.bankName} {row.accountNumber} ({row.accountHolder})
              </div>
            )}
          </div>
        );
      })}

      <div className="card bg-ink text-white flex justify-between items-center">
        <span className="text-sm font-medium">이번달 총 지급액</span>
        <span className="text-lg font-bold">{grandTotal.toLocaleString()}원</span>
      </div>
    </div>
  );
}
