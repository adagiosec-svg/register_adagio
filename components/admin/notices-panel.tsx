"use client";

import { useState } from "react";

type Importance = "NORMAL" | "IMPORTANT" | "URGENT";

interface Notice {
  id: string;
  title: string;
  content: string;
  importance: Importance;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface Props {
  initialNotices: Notice[];
}

const IMPORTANCE_OPTIONS: { value: Importance; label: string }[] = [
  { value: "NORMAL",    label: "일반" },
  { value: "IMPORTANT", label: "중요" },
  { value: "URGENT",    label: "긴급" },
];

const emptyForm = {
  title: "",
  content: "",
  importance: "NORMAL" as Importance,
  sortOrder: "0",
  isActive: true,
};

export function NoticesPanel({ initialNotices }: Props) {
  const [notices, setNotices] = useState(initialNotices);
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

  function openEdit(n: Notice) {
    setForm({
      title: n.title,
      content: n.content,
      importance: n.importance,
      sortOrder: n.sortOrder.toString(),
      isActive: n.isActive,
    });
    setEditingId(n.id);
    setShowForm(true);
    setError("");
  }

  function setField(k: keyof typeof form, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError("");
    const body = {
      title: form.title.trim(),
      content: form.content.trim(),
      importance: form.importance,
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive,
    };
    try {
      const url = editingId ? `/api/admin/notices/${editingId}` : "/api/admin/notices";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "오류"); return; }
      if (editingId) {
        setNotices((prev) => prev.map((n) => n.id === editingId ? { ...n, ...body } : n));
      } else {
        setNotices((prev) => [data, ...prev]);
      }
      setShowForm(false);
      setEditingId(null);
    } catch {
      setError("네트워크 오류");
    } finally {
      setIsPending(false);
    }
  }

  async function toggleActive(n: Notice) {
    const res = await fetch(`/api/admin/notices/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !n.isActive }),
    });
    if (res.ok) {
      setNotices((prev) => prev.map((x) => x.id === n.id ? { ...x, isActive: !x.isActive } : x));
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}"을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/admin/notices/${id}`, { method: "DELETE" });
    if (res.ok) setNotices((prev) => prev.filter((n) => n.id !== id));
  }

  const IMPORTANCE_BADGE: Record<Importance, string> = {
    URGENT:    "bg-red-100 text-red-700",
    IMPORTANT: "bg-yellow-100 text-yellow-700",
    NORMAL:    "bg-surface-1 text-ink-muted",
  };
  const IMPORTANCE_LABEL: Record<Importance, string> = {
    URGENT: "긴급", IMPORTANT: "중요", NORMAL: "일반",
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm font-medium text-ink-secondary">총 {notices.length}개</p>
        <button onClick={openAdd} className="btn-primary text-sm px-4 py-2">+ 공지 추가</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">{error}</div>
      )}

      <div className="space-y-2 mb-4">
        {notices.map((n) => (
          <div key={n.id} className={`card flex items-start gap-3 ${!n.isActive ? "opacity-50" : ""}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${IMPORTANCE_BADGE[n.importance]}`}>
                  {IMPORTANCE_LABEL[n.importance]}
                </span>
                <span className="text-sm font-medium text-ink">{n.title}</span>
                {!n.isActive && <span className="text-[10px] text-ink-muted">(비활성)</span>}
              </div>
              <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">{n.content}</p>
            </div>
            <div className="flex gap-1.5 flex-none">
              <button onClick={() => toggleActive(n)} className="btn-secondary text-xs px-2.5 py-1.5">
                {n.isActive ? "숨김" : "공개"}
              </button>
              <button onClick={() => openEdit(n)} className="btn-secondary text-xs px-2.5 py-1.5">수정</button>
              <button onClick={() => handleDelete(n.id, n.title)} className="btn-danger text-xs px-2.5 py-1.5">삭제</button>
            </div>
          </div>
        ))}
        {notices.length === 0 && (
          <div className="card text-center py-8 text-ink-muted text-sm">공지사항이 없습니다.</div>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card border-2 border-primary/30 space-y-3">
          <p className="text-sm font-bold text-ink">{editingId ? "공지 수정" : "공지 추가"}</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="form-label">제목</label>
              <input type="text" value={form.title} onChange={(e) => setField("title", e.target.value)} required className="input-text w-full text-sm" />
            </div>
            <div>
              <label className="form-label">중요도</label>
              <select value={form.importance} onChange={(e) => setField("importance", e.target.value)} className="input-text w-full text-sm">
                {IMPORTANCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">내용</label>
            <textarea
              value={form.content}
              onChange={(e) => setField("content", e.target.value)}
              required
              rows={5}
              className="input-text w-full text-sm resize-y"
            />
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="form-label">정렬 순서 (높을수록 상단)</label>
              <input type="number" value={form.sortOrder} onChange={(e) => setField("sortOrder", e.target.value)} className="input-text w-24 text-sm" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} className="w-4 h-4" />
              <label htmlFor="isActive" className="text-xs text-ink-secondary">공개</label>
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
