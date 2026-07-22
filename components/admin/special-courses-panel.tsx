"use client";

import { useState } from "react";

interface Instructor {
  id: string;
  name: string;
  themeColor: string;
}

interface SpecialCourse {
  id: string;
  name: string;
  instructor: Instructor | null;
  instructorNameText: string | null;
  instructorContact: string | null;
  sessionAt: string;
  durationHours: number;
  level: string | null;
  hourlyRate: number;
  tuitionFee: number;
  instructorHourlyFee: number;
  instructorFee: number;
  capacity: number;
  description: string | null;
  confirmedCount: number;
}

interface Registration {
  id: string;
  userId: string;
  username: string;
  name: string;
  grade: string | null;
  status: "CONFIRMED" | "WAITLIST" | "CANCELLED";
  waitlistOrder: number | null;
  paymentStatus: "PENDING" | "PAID" | "UNPAID";
  registeredAt: string;
  confirmedAt: string | null;
}

interface Props {
  initialCourses: SpecialCourse[];
  instructors: Instructor[];
}

const emptyForm = {
  name: "",
  instructorId: "",
  instructorNameText: "",
  instructorContact: "",
  sessionAt: "",
  durationHours: "2",
  level: "",
  hourlyRate: "",
  instructorHourlyFee: "",
  capacity: "20",
  description: "",
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "미확인",
  PAID: "입금완료",
  UNPAID: "미입금",
};

const PAYMENT_BADGE: Record<string, string> = {
  PENDING: "badge-yellow",
  PAID: "badge-green",
  UNPAID: "badge-red",
};

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function SpecialCoursesPanel({ initialCourses, instructors }: Props) {
  const [courses, setCourses] = useState(initialCourses);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [regs, setRegs] = useState<Record<string, Registration[]>>({});
  const [regsLoading, setRegsLoading] = useState<string | null>(null);

  function setField(k: keyof typeof emptyForm, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError("");
  }

  function openEdit(c: SpecialCourse) {
    const sessionLocal = new Date(c.sessionAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localStr = `${sessionLocal.getFullYear()}-${pad(sessionLocal.getMonth() + 1)}-${pad(sessionLocal.getDate())}T${pad(sessionLocal.getHours())}:${pad(sessionLocal.getMinutes())}`;
    setForm({
      name: c.name,
      instructorId: c.instructor?.id ?? "",
      instructorNameText: c.instructorNameText ?? "",
      instructorContact: c.instructorContact ?? "",
      sessionAt: localStr,
      durationHours: String(c.durationHours),
      level: c.level ?? "",
      hourlyRate: String(c.hourlyRate),
      instructorHourlyFee: String(c.instructorHourlyFee),
      capacity: String(c.capacity),
      description: c.description ?? "",
    });
    setEditingId(c.id);
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError("");

    const body = {
      name: form.name.trim(),
      instructorId: form.instructorId || null,
      instructorNameText: form.instructorNameText.trim() || null,
      instructorContact: form.instructorContact.trim() || null,
      sessionAt: new Date(form.sessionAt).toISOString(),
      durationHours: Number(form.durationHours),
      level: form.level.trim() || null,
      hourlyRate: Number(form.hourlyRate),
      instructorHourlyFee: Number(form.instructorHourlyFee),
      capacity: Number(form.capacity),
      description: form.description.trim() || null,
    };

    try {
      const url = editingId ? `/api/admin/special/${editingId}` : "/api/admin/special";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "오류"); return; }

      const tuitionFee = Math.round(body.hourlyRate * body.durationHours);
      const instructorFee = Math.round(body.instructorHourlyFee * body.durationHours);
      const instructor = instructors.find((i) => i.id === body.instructorId) ?? null;

      if (editingId) {
        setCourses((prev) =>
          prev.map((c) =>
            c.id === editingId
              ? { ...c, ...body, tuitionFee, instructorFee, instructor, id: editingId, confirmedCount: c.confirmedCount }
              : c
          )
        );
      } else {
        setCourses((prev) => [
          { ...data, tuitionFee, instructorFee, instructor, confirmedCount: 0 },
          ...prev,
        ]);
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
    if (!confirm(`"${name}" 수업을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/admin/special/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "삭제 실패"); return; }
    setCourses((prev) => prev.filter((c) => c.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (regs[id]) return;
    setRegsLoading(id);
    try {
      const res = await fetch(`/api/admin/special/${id}/registrations`);
      const data = await res.json();
      setRegs((prev) => ({ ...prev, [id]: data }));
    } catch {
      setRegs((prev) => ({ ...prev, [id]: [] }));
    } finally {
      setRegsLoading(null);
    }
  }

  async function updatePayment(courseId: string, registrationId: string, paymentStatus: string) {
    const res = await fetch(`/api/admin/special/${courseId}/registrations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId, paymentStatus }),
    });
    if (res.ok) {
      setRegs((prev) => ({
        ...prev,
        [courseId]: prev[courseId].map((r) =>
          r.id === registrationId ? { ...r, paymentStatus: paymentStatus as Registration["paymentStatus"] } : r
        ),
      }));
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm font-medium text-ink-secondary">{courses.length}개 수업</p>
        <button onClick={openAdd} className="btn-primary text-sm px-4 py-2">+ 수업 추가</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">
          {error}
        </div>
      )}

      <div className="space-y-2 mb-4">
        {courses.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-center justify-between gap-3">
              <div
                className="w-1 self-stretch rounded-full flex-none"
                style={{ backgroundColor: c.instructor?.themeColor ?? "#9ca3af" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-ink">{c.name}</span>
                  {c.level && (
                    <span className="text-[10px] bg-surface-1 text-ink-muted px-1.5 py-0.5 rounded">{c.level}</span>
                  )}
                  <span className="chip-special">Special</span>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  {fmt(c.sessionAt)} · {c.durationHours}시간
                  {" · "}강사: {c.instructor?.name ?? c.instructorNameText ?? "—"}
                  {" · "}정원 {c.confirmedCount}/{c.capacity}
                  {" · "}수강료 {c.tuitionFee.toLocaleString()}원
                </p>
              </div>
              <div className="flex gap-1.5 flex-none">
                <button
                  onClick={() => toggleExpand(c.id)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  신청자 {expandedId === c.id ? "▲" : "▼"}
                </button>
                <button onClick={() => openEdit(c)} className="btn-secondary text-xs px-3 py-1.5">수정</button>
                <button onClick={() => handleDelete(c.id, c.name)} className="btn-danger text-xs px-3 py-1.5">삭제</button>
              </div>
            </div>

            {expandedId === c.id && (
              <div className="mt-3 pt-3 border-t border-black/[0.06]">
                {regsLoading === c.id ? (
                  <p className="text-xs text-ink-muted">로딩 중...</p>
                ) : !regs[c.id] || regs[c.id].length === 0 ? (
                  <p className="text-xs text-ink-muted">신청자가 없습니다.</p>
                ) : (
                  <div className="table-wrap overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-surface-1 text-ink-muted">
                          <th className="px-3 py-2 text-left font-medium">이름</th>
                          <th className="px-3 py-2 text-left font-medium">아이디</th>
                          <th className="px-3 py-2 text-left font-medium">상태</th>
                          <th className="px-3 py-2 text-left font-medium">입금</th>
                          <th className="px-3 py-2 text-left font-medium">신청일</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regs[c.id].map((r) => (
                          <tr key={r.id} className="border-t border-black/[0.05]">
                            <td className="px-3 py-2 font-medium">{r.name}</td>
                            <td className="px-3 py-2 text-ink-muted">{r.username}</td>
                            <td className="px-3 py-2">
                              <span className={r.status === "CONFIRMED" ? "badge-green" : r.status === "WAITLIST" ? "badge-yellow" : "badge-gray"}>
                                {r.status === "CONFIRMED" ? "확정" : r.status === "WAITLIST" ? `후보 ${r.waitlistOrder}번` : "취소"}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {r.status === "CONFIRMED" ? (
                                <select
                                  value={r.paymentStatus}
                                  onChange={(e) => updatePayment(c.id, r.id, e.target.value)}
                                  className="text-xs border border-black/[0.18] rounded px-1 py-0.5 bg-white"
                                >
                                  <option value="PENDING">미확인</option>
                                  <option value="PAID">입금완료</option>
                                  <option value="UNPAID">미입금</option>
                                </select>
                              ) : (
                                <span className={`badge ${PAYMENT_BADGE[r.paymentStatus]}`}>
                                  {PAYMENT_LABELS[r.paymentStatus]}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-ink-muted">{fmt(r.registeredAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {courses.length === 0 && (
          <div className="card text-center py-8 text-ink-muted text-sm">특별 수업이 없습니다.</div>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card border-2 border-accent-border space-y-3">
          <p className="text-sm font-bold text-ink mb-1">{editingId ? "수업 수정" : "특별 수업 추가"}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="form-label">수업명</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                required
                className="input-text"
                placeholder="예: 힙합 특강"
              />
            </div>

            <div>
              <label className="form-label">강사 (선택)</label>
              <select value={form.instructorId} onChange={(e) => setField("instructorId", e.target.value)} className="input-text">
                <option value="">선택 안 함</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>

            <div>
              <label className="form-label">외부강사명</label>
              <input type="text" value={form.instructorNameText} onChange={(e) => setField("instructorNameText", e.target.value)} className="input-text" placeholder="강사명 직접 입력" />
            </div>

            <div>
              <label className="form-label">강사 연락처</label>
              <input type="text" value={form.instructorContact} onChange={(e) => setField("instructorContact", e.target.value)} className="input-text" placeholder="010-0000-0000" />
            </div>

            <div>
              <label className="form-label">레벨</label>
              <input type="text" value={form.level} onChange={(e) => setField("level", e.target.value)} className="input-text" placeholder="예: 입문, All" />
            </div>

            <div>
              <label className="form-label">수업 일시</label>
              <input type="datetime-local" value={form.sessionAt} onChange={(e) => setField("sessionAt", e.target.value)} required className="input-text" />
            </div>

            <div>
              <label className="form-label">수업 시간 (시간)</label>
              <input type="number" step="0.5" min="0.5" value={form.durationHours} onChange={(e) => setField("durationHours", e.target.value)} required className="input-text" />
            </div>

            <div>
              <label className="form-label">시간당 수강료 (원)</label>
              <input type="number" min="0" value={form.hourlyRate} onChange={(e) => setField("hourlyRate", e.target.value)} required className="input-text" placeholder="예: 15000" />
            </div>

            <div>
              <label className="form-label">시간당 강사료 (원)</label>
              <input type="number" min="0" value={form.instructorHourlyFee} onChange={(e) => setField("instructorHourlyFee", e.target.value)} required className="input-text" placeholder="예: 30000" />
            </div>

            <div>
              <label className="form-label">정원</label>
              <input type="number" min="1" value={form.capacity} onChange={(e) => setField("capacity", e.target.value)} required className="input-text" />
            </div>

            {form.hourlyRate && form.durationHours && (
              <div className="col-span-2 bg-accent-bg border border-accent-border rounded-lg px-3 py-2 text-xs text-ink-secondary">
                수강료: {(Number(form.hourlyRate) * Number(form.durationHours)).toLocaleString()}원
                {form.instructorHourlyFee && ` · 강사료: ${(Number(form.instructorHourlyFee) * Number(form.durationHours)).toLocaleString()}원`}
                (시간당 × {form.durationHours}시간)
              </div>
            )}

            <div className="col-span-2">
              <label className="form-label">수업 설명 (선택)</label>
              <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} className="input-text h-16 resize-none" placeholder="수업 소개, 준비물 등" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={isPending} className="btn-primary text-sm px-5 py-2">
              {isPending ? "저장 중..." : editingId ? "저장" : "추가"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm px-4 py-2">
              취소
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
