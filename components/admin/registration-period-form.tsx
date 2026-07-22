"use client";

import { useState } from "react";

interface Period {
  id: string;
  openAt: string;
  closeAt: string;
  isActive: boolean;
}

interface Props {
  yearMonth: string;
  initialPeriod: Period | null;
}

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RegistrationPeriodForm({ yearMonth, initialPeriod }: Props) {
  const [period, setPeriod] = useState(initialPeriod);
  const [openAt, setOpenAt] = useState(initialPeriod ? toLocalDatetimeValue(initialPeriod.openAt) : "");
  const [closeAt, setCloseAt] = useState(initialPeriod ? toLocalDatetimeValue(initialPeriod.closeAt) : "");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSave() {
    if (!openAt || !closeAt) { setError("시작/종료 일시를 모두 입력해주세요."); return; }
    setIsPending(true);
    setError("");
    setMsg("");
    try {
      const body = {
        yearMonth,
        openAt: new Date(openAt).toISOString(),
        closeAt: new Date(closeAt).toISOString(),
      };
      const url = period ? `/api/admin/registration-period?id=${period.id}` : "/api/admin/registration-period";
      const method = period ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "오류"); return; }
      setPeriod({ id: data.id, openAt: data.openAt, closeAt: data.closeAt, isActive: data.isActive });
      setMsg("저장됐습니다.");
    } catch {
      setError("네트워크 오류");
    } finally {
      setIsPending(false);
    }
  }

  async function toggleActive() {
    if (!period) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/registration-period?id=${period.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !period.isActive }),
      });
      const data = await res.json();
      if (res.ok) setPeriod((p) => p ? { ...p, isActive: data.isActive } : null);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-ink">수강신청 기간 설정</p>
        {period && (
          <button
            onClick={toggleActive}
            disabled={isPending}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              period.isActive
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            {period.isActive ? "비활성화" : "활성화"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">신청 시작</label>
          <input
            type="datetime-local"
            value={openAt}
            onChange={(e) => setOpenAt(e.target.value)}
            className="input-text w-full text-sm"
          />
        </div>
        <div>
          <label className="form-label">신청 마감</label>
          <input
            type="datetime-local"
            value={closeAt}
            onChange={(e) => setCloseAt(e.target.value)}
            className="input-text w-full text-sm"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {msg && <p className="text-xs text-green-600 mt-2">{msg}</p>}

      <div className="mt-3 flex items-center gap-3">
        <button onClick={handleSave} disabled={isPending} className="btn-primary text-sm px-5 py-2">
          {isPending ? "저장 중..." : period ? "기간 수정" : "기간 생성"}
        </button>
        {period && (
          <span className={`text-xs font-medium ${period.isActive ? "text-green-600" : "text-ink-muted"}`}>
            {period.isActive ? "● 수강신청 활성" : "○ 비활성"}
          </span>
        )}
      </div>
    </div>
  );
}
