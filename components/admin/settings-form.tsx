"use client";

import { useState } from "react";

interface Props {
  initialConfig: Record<string, string>;
}

export function SettingsForm({ initialConfig }: Props) {
  const [config, setConfig] = useState<Record<string, string>>(initialConfig);
  const [isPending, setIsPending] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  function setKey(key: string, value: string) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  async function handleSave() {
    setIsPending(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) { setError("저장 실패"); return; }
      setMsg("설정이 저장됐습니다.");
    } catch {
      setError("네트워크 오류");
    } finally {
      setIsPending(false);
    }
  }

  function Field({ k, label }: { k: string; label: string }) {
    return (
      <div>
        <label className="text-[10px] text-ink-muted block mb-1">{label}</label>
        <input
          type="text"
          value={config[k] ?? ""}
          onChange={(e) => setKey(k, e.target.value)}
          className="input-text w-full text-sm"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* 수강료 단가 */}
      <div className="card">
        <p className="text-xs font-bold text-ink-muted tracking-wider mb-3">수강료 단가</p>

        {/* 월 수강료 */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field k="tuition_full_4" label="Full 4회 수강료 (원)" />
          <Field k="tuition_half_4" label="Half 4회 수강료 (원)" />
          <Field k="tuition_full_3" label="Full 3회 수강료 (원)" />
          <Field k="tuition_half_3" label="Half 3회 수강료 (원)" />
        </div>

        <hr className="border-black/10 my-3" />

        {/* 쿠폰 단가 */}
        <p className="text-[10px] text-ink-muted mb-2">쿠폰 단가 (1회)</p>
        <div className="grid grid-cols-2 gap-3">
          <Field k="tuition_full_1" label="Full 쿠폰 단가 (원)" />
          <Field k="tuition_half_1" label="Half 쿠폰 단가 (원)" />
        </div>
      </div>

      {/* 강사료 단가 */}
      <div className="card">
        <p className="text-xs font-bold text-ink-muted tracking-wider mb-3">강사료 단가</p>
        <div className="grid grid-cols-1 gap-3">
          {[
            { k: "instructor_fee_rate_full", label: "Full 강사료 단가 (원/회)" },
            { k: "instructor_fee_rate_half", label: "Half 강사료 단가 (원/회)" },
          ].map(({ k, label }) => (
            <div key={k} className="flex items-center gap-3">
              <label className="text-sm text-ink-secondary w-48 flex-none">{label}</label>
              <input
                type="text"
                value={config[k] ?? ""}
                onChange={(e) => setKey(k, e.target.value)}
                className="input-text flex-1 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 동호회비 */}
      <div className="card">
        <p className="text-xs font-bold text-ink-muted tracking-wider mb-3">동호회비</p>
        <div className="flex items-center gap-3">
          <label className="text-sm text-ink-secondary w-48 flex-none">동호회비 금액 (원/월)</label>
          <input
            type="text"
            value={config["club_fee"] ?? ""}
            onChange={(e) => setKey("club_fee", e.target.value)}
            className="input-text flex-1 text-sm"
          />
        </div>
      </div>

      {/* 수강료 납부 계좌 */}
      <div className="card">
        <p className="text-xs font-bold text-ink-muted tracking-wider mb-3">수강료 납부 계좌</p>
        <div className="grid grid-cols-1 gap-3">
          {[
            { k: "tuition_account_bank", label: "은행명" },
            { k: "tuition_account_number", label: "계좌번호" },
            { k: "tuition_account_holder", label: "예금주" },
          ].map(({ k, label }) => (
            <div key={k} className="flex items-center gap-3">
              <label className="text-sm text-ink-secondary w-48 flex-none">{label}</label>
              <input
                type="text"
                value={config[k] ?? ""}
                onChange={(e) => setKey(k, e.target.value)}
                className="input-text flex-1 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 동호회비 납부 계좌 */}
      <div className="card">
        <p className="text-xs font-bold text-ink-muted tracking-wider mb-3">동호회비 납부 계좌</p>
        <div className="grid grid-cols-1 gap-3">
          {[
            { k: "club_account_bank", label: "은행명" },
            { k: "club_account_number", label: "계좌번호" },
            { k: "club_account_holder", label: "예금주" },
          ].map(({ k, label }) => (
            <div key={k} className="flex items-center gap-3">
              <label className="text-sm text-ink-secondary w-48 flex-none">{label}</label>
              <input
                type="text"
                value={config[k] ?? ""}
                onChange={(e) => setKey(k, e.target.value)}
                className="input-text flex-1 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {msg && <p className="text-xs text-green-600">{msg}</p>}

      <button onClick={handleSave} disabled={isPending} className="btn-primary px-6 py-2.5">
        {isPending ? "저장 중..." : "전체 저장"}
      </button>
    </div>
  );
}
