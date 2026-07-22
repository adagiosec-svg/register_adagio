"use client";

import { useState } from "react";

interface Instructor {
  id: string;
  name: string;
  phone: string | null;
  themeColor: string;
  subsidyAmount: number;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  memo: string | null;
  courseCount: number;
}

interface Props {
  initialInstructors: Instructor[];
}

const emptyForm = {
  name: "",
  phone: "",
  subsidyAmount: "0",
  bankName: "",
  accountNumber: "",
  accountHolder: "",
  memo: "",
};

export function InstructorsPanel({ initialInstructors }: Props) {
  const [instructors, setInstructors] = useState(initialInstructors);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError("");
  }

  function openEdit(i: Instructor) {
    setForm({
      name: i.name,
      phone: i.phone ?? "",
      subsidyAmount: i.subsidyAmount.toString(),
      bankName: i.bankName ?? "",
      accountNumber: i.accountNumber ?? "",
      accountHolder: i.accountHolder ?? "",
      memo: i.memo ?? "",
    });
    setEditingId(i.id);
    setShowForm(true);
    setError("");
  }

  function setField(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError("");
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      subsidyAmount: Number(form.subsidyAmount),
      bankName: form.bankName.trim() || null,
      accountNumber: form.accountNumber.trim() || null,
      accountHolder: form.accountHolder.trim() || null,
      memo: form.memo.trim() || null,
    };
    try {
      const url = editingId ? `/api/admin/instructors/${editingId}` : "/api/admin/instructors";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "오류"); return; }
      if (editingId) {
        setInstructors((prev) => prev.map((i) => i.id === editingId ? { ...i, ...body } : i));
      } else {
        setInstructors((prev) => [...prev, { ...data, courseCount: 0 }]);
      }
      setShowForm(false);
      setEditingId(null);
    } catch {
      setError("네트워크 오류");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 강사를 비활성화하시겠습니까?`)) return;
    const res = await fetch(`/api/admin/instructors/${id}`, { method: "DELETE" });
    if (res.ok) setInstructors((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm font-medium text-ink-secondary">{instructors.length}명의 강사</p>
        <button onClick={openAdd} className="btn-primary text-sm px-4 py-2">+ 강사 추가</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">
          {error}
        </div>
      )}

      <div className="space-y-2 mb-4">
        {instructors.map((i) => (
          <div key={i.id} className="card flex items-start gap-3">
            <div
              className="w-3 h-3 rounded-full mt-1 flex-none"
              style={{ backgroundColor: i.themeColor }}
              title={i.themeColor}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink">{i.name}</span>
                {i.courseCount > 0 && (
                  <span className="text-[10px] text-ink-muted">수업 {i.courseCount}개</span>
                )}
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                {i.phone && `${i.phone} · `}
                지원금 {i.subsidyAmount.toLocaleString()}원/월
              </p>
              {(i.bankName || i.accountNumber) && (
                <p className="text-xs text-ink-muted">
                  {i.bankName} {i.accountNumber} ({i.accountHolder})
                </p>
              )}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => openEdit(i)} className="btn-secondary text-xs px-3 py-1.5">수정</button>
              <button onClick={() => handleDelete(i.id, i.name)} className="btn-danger text-xs px-3 py-1.5">삭제</button>
            </div>
          </div>
        ))}
        {instructors.length === 0 && (
          <div className="card text-center py-8 text-ink-muted text-sm">등록된 강사가 없습니다.</div>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card border-2 border-primary/30 space-y-3">
          <p className="text-sm font-bold text-ink">{editingId ? "강사 수정" : "강사 추가"}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">이름</label>
              <input type="text" value={form.name} onChange={(e) => setField("name", e.target.value)} required className="input-text w-full text-sm" />
            </div>
            <div>
              <label className="form-label">연락처</label>
              <input type="text" value={form.phone} onChange={(e) => setField("phone", e.target.value)} className="input-text w-full text-sm" placeholder="010-0000-0000" />
            </div>
            <div>
              <label className="form-label">월 지원금 (원)</label>
              <input type="number" value={form.subsidyAmount} onChange={(e) => setField("subsidyAmount", e.target.value)} className="input-text w-full text-sm" min="0" />
            </div>
            <div>
              <label className="form-label">은행</label>
              <input type="text" value={form.bankName} onChange={(e) => setField("bankName", e.target.value)} className="input-text w-full text-sm" placeholder="국민은행" />
            </div>
            <div>
              <label className="form-label">계좌번호</label>
              <input type="text" value={form.accountNumber} onChange={(e) => setField("accountNumber", e.target.value)} className="input-text w-full text-sm" />
            </div>
            <div>
              <label className="form-label">예금주</label>
              <input type="text" value={form.accountHolder} onChange={(e) => setField("accountHolder", e.target.value)} className="input-text w-full text-sm" />
            </div>
            <div className="col-span-2">
              <label className="form-label">메모</label>
              <input type="text" value={form.memo} onChange={(e) => setField("memo", e.target.value)} className="input-text w-full text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="btn-primary text-sm px-5 py-2">
              {isPending ? "저장 중..." : editingId ? "저장" : "추가"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm px-4 py-2">취소</button>
          </div>
        </form>
      )}
    </div>
  );
}
