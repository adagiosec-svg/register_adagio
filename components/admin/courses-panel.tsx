"use client";

import { useState } from "react";
import { CourseListCard } from "@/components/ui/course-list-card";

interface Instructor {
  id: string;
  name: string;
  themeColor: string;
}

interface Course {
  id: string;
  name: string;
  courseType: "FULL" | "HALF" | "SPECIAL";
  level: string | null;
  schedule: string;
  daysCount: number | null;
  capacity: number;
  tuitionFee: number;
  instructorFee: number;
  tuitionFeeIsManual: boolean;
  confirmedCount: number;
  instructor: Instructor | null;
  instructorNameText: string | null;
}

interface Props {
  yearMonth: string;
  initialCourses: Course[];
  instructors: Instructor[];
  levels: string[];
}

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

const emptyForm = {
  name: "",
  instructorId: "",
  instructorNameText: "",
  courseType: "FULL" as "FULL" | "HALF" | "SPECIAL",
  level: "",
  day: "",
  time: "",
  scheduleText: "",
  daysCount: "",
  capacity: "15",
  tuitionFeeIsManual: false,
  tuitionFeeOverride: "",
};

function parseSchedule(schedule: string): { day: string; time: string; scheduleText: string } {
  const match = schedule.match(/^([월화수목금토일])요일\s+(\d{2}:\d{2})$/);
  if (match) return { day: match[1], time: match[2], scheduleText: "" };
  return { day: "", time: "", scheduleText: schedule };
}

export function CoursesPanel({ yearMonth, initialCourses, instructors, levels }: Props) {
  const [courses, setCourses] = useState(initialCourses);
  const [levelsState, setLevelsState] = useState(levels);
  const [newLevel, setNewLevel] = useState("");
  const [levelSaving, setLevelSaving] = useState(false);
  const [showLevelInput, setShowLevelInput] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  function autoName(day: string, level: string): string {
    if (!day) return "";
    return `${day}요일${level ? `_${level}` : ""}`;
  }

  function openAdd() {
    setForm(emptyForm);
    setNameManuallyEdited(false);
    setEditingId(null);
    setShowForm(true);
    setError("");
  }

  function openEdit(c: Course) {
    const { day, time, scheduleText } = parseSchedule(c.schedule);
    setForm({
      name: c.name,
      instructorId: c.instructor?.id ?? "",
      instructorNameText: c.instructorNameText ?? "",
      courseType: c.courseType,
      level: c.level ?? "",
      day,
      time,
      scheduleText,
      daysCount: c.daysCount?.toString() ?? "",
      capacity: c.capacity.toString(),
      tuitionFeeIsManual: c.tuitionFeeIsManual,
      tuitionFeeOverride: c.tuitionFeeIsManual ? c.tuitionFee.toString() : "",
    });
    setNameManuallyEdited(true);
    setEditingId(c.id);
    setShowForm(true);
    setError("");
  }

  function setField(k: keyof typeof form, v: string | boolean) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (!nameManuallyEdited && (k === "day" || k === "level")) {
        const day = k === "day" ? (v as string) : f.day;
        const level = k === "level" ? (v as string) : f.level;
        next.name = autoName(day, level);
      }
      return next;
    });
  }

  function handleNameChange(v: string) {
    setNameManuallyEdited(true);
    setForm((f) => ({ ...f, name: v }));
  }

  function buildSchedule(): string {
    if (form.courseType === "SPECIAL") return form.scheduleText.trim();
    if (!form.day) return "";
    return `${form.day}요일${form.time ? ` ${form.time}` : ""}`;
  }

  async function addLevel() {
    const trimmed = newLevel.trim();
    if (!trimmed || levelsState.includes(trimmed)) return;
    setLevelSaving(true);
    try {
      const updated = [...levelsState, trimmed];
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_levels: updated.join(",") }),
      });
      setLevelsState(updated);
      setNewLevel("");
      setShowLevelInput(false);
    } finally {
      setLevelSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError("");

    const schedule = buildSchedule();
    const body = {
      yearMonth,
      name: form.name.trim(),
      instructorId: form.instructorId || null,
      instructorNameText: form.instructorNameText.trim() || null,
      courseType: form.courseType,
      level: form.level.trim() || null,
      schedule,
      daysCount: form.daysCount ? Number(form.daysCount) : null,
      capacity: Number(form.capacity),
      tuitionFeeIsManual: form.tuitionFeeIsManual,
      tuitionFeeOverride: form.tuitionFeeIsManual && form.tuitionFeeOverride
        ? Number(form.tuitionFeeOverride) : undefined,
    };

    try {
      const url = editingId ? `/api/admin/courses/${editingId}` : "/api/admin/courses";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "오류"); return; }

      if (editingId) {
        setCourses((prev) => prev.map((c) =>
          c.id === editingId
            ? { ...c, ...body, id: editingId, confirmedCount: c.confirmedCount, instructor: instructors.find((i) => i.id === body.instructorId) ?? null }
            : c
        ));
      } else {
        setCourses((prev) => [...prev, { ...data, confirmedCount: 0, instructor: instructors.find((i) => i.id === data.instructorId) ?? null }]);
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
    const res = await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "삭제 실패"); return; }
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  const isSpecial = form.courseType === "SPECIAL";

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm font-medium text-ink-secondary">{yearMonth} · {courses.length}개 수업</p>
        <button onClick={openAdd} className="btn-primary text-sm px-4 py-2">+ 수업 추가</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">
          {error}
        </div>
      )}

      {/* 수업 목록 */}
      <div className="space-y-2 mb-4">
        {courses.map((c) => (
          <CourseListCard
            key={c.id}
            name={c.name}
            courseType={c.courseType}
            level={c.level}
            schedule={c.schedule}
            daysCount={c.daysCount}
            instructorName={c.instructor?.name ?? c.instructorNameText ?? "—"}
            themeColor={c.instructor?.themeColor}
            confirmedCount={c.confirmedCount}
            capacity={c.capacity}
            tuitionFee={c.tuitionFee}
            trailing={
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(c)} className="btn-secondary text-xs px-3 py-1.5">수정</button>
                <button onClick={() => handleDelete(c.id, c.name)} className="btn-danger text-xs px-3 py-1.5">삭제</button>
              </div>
            }
          />
        ))}
        {courses.length === 0 && (
          <div className="card text-center py-8 text-ink-muted text-sm">수업이 없습니다.</div>
        )}
      </div>

      {/* 수업 추가/수정 폼 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card border-2 border-black/10 space-y-3">
          <p className="text-sm font-bold text-ink mb-1">{editingId ? "수업 수정" : "수업 추가"}</p>

          <div className="grid grid-cols-2 gap-3">

            {/* 유형 */}
            <div>
              <label className="form-label">유형</label>
              <select value={form.courseType} onChange={(e) => setField("courseType", e.target.value)} className="input-text text-sm">
                <option value="FULL">Full 80분</option>
                <option value="HALF">Half 40분</option>
                <option value="SPECIAL">Special</option>
              </select>
            </div>

            {/* 레벨 */}
            <div>
              <label className="form-label">레벨</label>
              <div className="flex gap-1">
                <select value={form.level} onChange={(e) => setField("level", e.target.value)} className="input-text text-sm flex-1">
                  <option value="">없음</option>
                  {levelsState.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setShowLevelInput((v) => !v)}
                  className="btn-secondary text-xs px-2 py-1 flex-none"
                  title="레벨 추가"
                >
                  +
                </button>
              </div>
              {showLevelInput && (
                <div className="flex gap-1 mt-1">
                  <input
                    type="text"
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLevel(); } }}
                    placeholder="새 레벨명"
                    className="input-text text-sm flex-1"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={addLevel}
                    disabled={levelSaving || !newLevel.trim()}
                    className="btn-primary text-xs px-3 py-1 flex-none"
                  >
                    {levelSaving ? "..." : "추가"}
                  </button>
                </div>
              )}
            </div>

            {/* 일정 */}
            {isSpecial ? (
              <div className="col-span-2">
                <label className="form-label">일정 (특강 일시)</label>
                <input
                  type="text"
                  value={form.scheduleText}
                  onChange={(e) => setField("scheduleText", e.target.value)}
                  required
                  className="input-text text-sm"
                  placeholder="예: 3월 15일(토) 14:00"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="form-label">요일</label>
                  <select
                    value={form.day}
                    onChange={(e) => setField("day", e.target.value)}
                    required={!isSpecial}
                    className="input-text text-sm"
                  >
                    <option value="">선택</option>
                    {DAYS.map((d) => <option key={d} value={d}>{d}요일</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">시작 시간</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setField("time", e.target.value)}
                    required={!isSpecial}
                    className="input-text text-sm"
                  />
                </div>
              </>
            )}

            {/* 수업명 */}
            <div className="col-span-2">
              <label className="form-label">
                수업명
                {!nameManuallyEdited && form.name && (
                  <span className="ml-1.5 text-[10px] text-accent font-normal">자동 생성됨</span>
                )}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="input-text text-sm"
                placeholder="예: 화요일_Lev 1"
              />
            </div>

            {/* 강사 */}
            <div>
              <label className="form-label">강사</label>
              <select value={form.instructorId} onChange={(e) => setField("instructorId", e.target.value)} className="input-text text-sm">
                <option value="">선택 안 함</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>

            <div>
              <label className="form-label">외부강사명 (선택)</label>
              <input type="text" value={form.instructorNameText} onChange={(e) => setField("instructorNameText", e.target.value)} className="input-text text-sm" placeholder="강사명 직접 입력" />
            </div>

            {/* 월 진행 횟수 */}
            {!isSpecial && (
              <div>
                <label className="form-label">월 진행 횟수</label>
                <select value={form.daysCount} onChange={(e) => setField("daysCount", e.target.value)} className="input-text text-sm">
                  <option value="">선택</option>
                  <option value="3">3회</option>
                  <option value="4">4회</option>
                </select>
              </div>
            )}

            {/* 정원 */}
            <div>
              <label className="form-label">정원</label>
              <input type="number" value={form.capacity} onChange={(e) => setField("capacity", e.target.value)} required className="input-text text-sm" min="1" />
            </div>

            {/* 수강료 직접 입력 */}
            <div className="flex items-center gap-2 col-span-2">
              <input
                type="checkbox"
                id="manual-fee"
                checked={form.tuitionFeeIsManual}
                onChange={(e) => setField("tuitionFeeIsManual", e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="manual-fee" className="text-xs text-ink-secondary">수강료 직접 입력</label>
              {form.tuitionFeeIsManual && (
                <input
                  type="number"
                  value={form.tuitionFeeOverride}
                  onChange={(e) => setField("tuitionFeeOverride", e.target.value)}
                  className="input-text text-sm w-32 ml-2"
                  placeholder="금액 (원)"
                  min="0"
                />
              )}
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
