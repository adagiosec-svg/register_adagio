"use client";

import { useState } from "react";

interface SpecialCourse {
  id: string;
  name: string;
  instructorNameText: string | null;
  sessionAt: string;
  durationHours: number;
  level: string | null;
  tuitionFee: number;
  capacity: number;
  description: string | null;
  confirmedCount: number;
  waitlistCount: number;
  myRegistration: {
    id: string;
    status: "CONFIRMED" | "WAITLIST";
    waitlistOrder: number | null;
  } | null;
}

interface Props {
  initialCourses: SpecialCourse[];
}

export function SpecialCourseList({ initialCourses }: Props) {
  const [courses, setCourses] = useState(initialCourses);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<Record<string, string>>({});

  async function handleRegister(courseId: string) {
    setPendingId(courseId);
    setError((e) => ({ ...e, [courseId]: "" }));
    try {
      const res = await fetch(`/api/special/${courseId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError((e) => ({ ...e, [courseId]: data.error ?? "오류가 발생했습니다." }));
        return;
      }
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? {
                ...c,
                confirmedCount: data.status === "CONFIRMED" ? c.confirmedCount + 1 : c.confirmedCount,
                waitlistCount: data.status === "WAITLIST" ? c.waitlistCount + 1 : c.waitlistCount,
                myRegistration: { id: data.id, status: data.status, waitlistOrder: data.waitlistOrder },
              }
            : c
        )
      );
    } catch {
      setError((e) => ({ ...e, [courseId]: "네트워크 오류가 발생했습니다." }));
    } finally {
      setPendingId(null);
    }
  }

  async function handleCancel(courseId: string) {
    if (!confirm("정말 취소하시겠습니까?")) return;
    setPendingId(courseId);
    setError((e) => ({ ...e, [courseId]: "" }));
    try {
      const res = await fetch(`/api/special/${courseId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError((e) => ({ ...e, [courseId]: data.error ?? "취소 중 오류가 발생했습니다." }));
        return;
      }
      setCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          const wasConfirmed = c.myRegistration?.status === "CONFIRMED";
          const wasWaitlist = c.myRegistration?.status === "WAITLIST";
          return {
            ...c,
            confirmedCount: wasConfirmed ? c.confirmedCount - 1 : c.confirmedCount,
            waitlistCount: wasWaitlist ? c.waitlistCount - 1 : c.waitlistCount,
            myRegistration: null,
          };
        })
      );
    } catch {
      setError((e) => ({ ...e, [courseId]: "네트워크 오류가 발생했습니다." }));
    } finally {
      setPendingId(null);
    }
  }

  if (courses.length === 0) {
    return (
      <div className="card text-center py-16 text-ink-muted text-sm">
        현재 신청 가능한 Special 수업이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {courses.map((course) => {
        const isFull = course.confirmedCount >= course.capacity;
        const isMyConfirmed = course.myRegistration?.status === "CONFIRMED";
        const isMyWaitlist = course.myRegistration?.status === "WAITLIST";
        const isLoading = pendingId === course.id;
        const sessionDate = new Date(course.sessionAt);

        return (
          <div key={course.id} className="card overflow-hidden">
            {/* 날짜 헤더 */}
            <div className="bg-ink/5 px-4 py-2 flex items-center justify-between -mx-4 -mt-4 mb-4">
              <span className="text-xs font-bold text-ink">
                {sessionDate.toLocaleDateString("ko-KR", {
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}
                {" "}
                {sessionDate.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="text-[10px] text-ink-muted">{course.durationHours}시간</span>
            </div>

            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <h3 className="text-sm font-bold text-ink truncate">{course.name}</h3>
                  {course.level && (
                    <span className="text-[10px] bg-surface-1 text-ink-muted px-1.5 py-0.5 rounded flex-none">
                      {course.level}
                    </span>
                  )}
                </div>
                {course.instructorNameText && (
                  <p className="text-xs text-ink-muted mb-1">{course.instructorNameText}</p>
                )}
                {course.description && (
                  <p className="text-xs text-ink-secondary mt-1 line-clamp-2">{course.description}</p>
                )}
              </div>
              <div className="text-right flex-none">
                <p className="text-sm font-bold text-ink">{course.tuitionFee.toLocaleString()}원</p>
                <p className="text-[10px] text-ink-muted mt-0.5">
                  {course.confirmedCount}/{course.capacity}명
                  {course.waitlistCount > 0 && ` · 후보 ${course.waitlistCount}명`}
                </p>
              </div>
            </div>

            {/* 내 상태 */}
            {isMyConfirmed && (
              <div className="mt-2 text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                ✓ 신청 완료 (입금 대기)
              </div>
            )}
            {isMyWaitlist && (
              <div className="mt-2 text-[10px] bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                후보 {course.myRegistration?.waitlistOrder}번 대기 중
              </div>
            )}

            {/* 에러 */}
            {error[course.id] && (
              <p className="mt-2 text-[11px] text-red-600">{error[course.id]}</p>
            )}

            {/* 액션 */}
            <div className="mt-3 flex gap-2">
              {!isMyConfirmed && !isMyWaitlist && (
                <button
                  onClick={() => handleRegister(course.id)}
                  disabled={isLoading}
                  className="btn-primary flex-1 justify-center py-2"
                >
                  {isLoading ? "처리 중..." : isFull ? "후보 등록" : "신청"}
                </button>
              )}
              {(isMyConfirmed || isMyWaitlist) && (
                <button
                  onClick={() => handleCancel(course.id)}
                  disabled={isLoading}
                  className="btn-danger flex-1 justify-center py-2"
                >
                  {isLoading ? "처리 중..." : "취소"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
