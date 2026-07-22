"use client";

import { useState } from "react";

interface Application {
  id: string;
  couponType: "FULL" | "HALF" | "SPECIAL";
  quantity: number;
  totalAmount: number;
  status: "PENDING" | "PROCESSED";
  appliedAt: string;
  validUntil: string | null;
  processedAt: string | null;
  user: { name: string; username: string };
  usageCount: number;
}

interface Props {
  initialApplications: Application[];
}

const TYPE_LABELS: Record<string, string> = { FULL: "Full 80분", HALF: "Half 40분", SPECIAL: "Special" };

export function AdminCouponsPanel({ initialApplications }: Props) {
  const [applications, setApplications] = useState(initialApplications);
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function processApplication(id: string) {
    setProcessingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "오류"); return; }
      setApplications((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: "PROCESSED", validUntil: data.validUntil, processedAt: data.processedAt } : a
        )
      );
    } catch {
      setError("네트워크 오류");
    } finally {
      setProcessingId(null);
    }
  }

  async function processAll() {
    const pending = applications.filter((a) => a.status === "PENDING");
    if (pending.length === 0 || !confirm(`${pending.length}건을 일괄 처리하시겠습니까?`)) return;
    for (const app of pending) {
      await processApplication(app.id);
    }
  }

  const filtered = filterStatus
    ? applications.filter((a) => a.status === filterStatus)
    : applications;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {[{ value: "PENDING", label: "처리 대기" }, { value: "PROCESSED", label: "완료" }, { value: "", label: "전체" }].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === f.value ? "bg-ink text-white" : "bg-surface-1 text-ink-secondary hover:bg-black/10"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {filterStatus === "PENDING" && filtered.length > 0 && (
          <button onClick={processAll} className="btn-primary text-xs px-3 py-1.5">
            전체 처리
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card text-center py-8 text-ink-muted text-sm">해당 내역이 없습니다.</div>
        ) : (
          filtered.map((app) => (
            <div key={app.id} className="card flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink">{app.user.name}</span>
                  <span className="text-xs text-ink-muted">{app.user.username}</span>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  {TYPE_LABELS[app.couponType]} × {app.quantity}회 · {app.totalAmount.toLocaleString()}원
                </p>
                <p className="text-[10px] text-ink-muted">
                  신청 {new Date(app.appliedAt).toLocaleDateString("ko-KR")}
                  {app.validUntil && ` · 유효 ${new Date(app.validUntil).toLocaleDateString("ko-KR")}까지`}
                </p>
              </div>
              {app.status === "PENDING" ? (
                <button
                  onClick={() => processApplication(app.id)}
                  disabled={processingId === app.id}
                  className="btn-primary text-xs px-3 py-1.5 flex-none"
                >
                  {processingId === app.id ? "처리 중..." : "처리 완료"}
                </button>
              ) : (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex-none">
                  완료
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
