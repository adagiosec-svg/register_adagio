"use client";

import { useEffect, useRef, useState } from "react";
import { getLevelColor } from "@/lib/timetable";
import type { CourseWithStats, RegistrationPeriodInfo } from "@/types/api";
import { useRouter } from "next/navigation";

interface Props {
  course: CourseWithStats;
  period: RegistrationPeriodInfo | null;
  onClose: () => void;
  onEnrolled: (courseId: string, result: { id: string; status: string; waitlistOrder: number | null }) => void;
  onCancelled: (registrationId: string) => void;
}

export function CourseDetailModal({ course, period, onClose, onEnrolled, onCancelled }: Props) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const { bg, text } = getLevelColor(course.level);
  const isOpen = period?.state === "open";
  const isFull = course.confirmedCount >= course.capacity;
  const isMyConfirmed = course.myRegistration?.status === "CONFIRMED";
  const isMyWaitlist = course.myRegistration?.status === "WAITLIST";

  // ESC 키 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleRegister() {
    setIsPending(true);
    setError("");
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다.");
        return;
      }
      onEnrolled(course.id, data);
      router.push("/result");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleCancel() {
    if (!course.myRegistration) return;
    if (!confirm("정말 취소하시겠습니까?")) return;
    setIsPending(true);
    setError("");
    try {
      const res = await fetch(`/api/registrations/${course.myRegistration.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "취소 중 오류가 발생했습니다.");
        return;
      }
      onCancelled(course.myRegistration.id);
      onClose();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        {/* 헤더 — 레벨 색상 */}
        <div
          className="px-5 py-4"
          style={{
            backgroundColor: bg,
            borderLeft: `4px solid ${course.instructor?.themeColor ?? "#9ca3af"}`,
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold tracking-wider mb-1" style={{ color: text }}>
                {course.level ?? "—"} · {course.courseType === "FULL" ? "Full 80분" : "Half 40분"}
              </p>
              <h2 className="text-base font-bold" style={{ color: text }}>
                {course.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-black/30 hover:text-black/60 transition-colors ml-3 mt-0.5"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 수업 메타 */}
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div>
              <p className="text-[10px] text-ink-muted mb-0.5">강사</p>
              <p className="text-sm font-medium">
                {course.instructor?.name ?? course.instructorNameText ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-ink-muted mb-0.5">수업 횟수</p>
              <p className="text-sm font-medium">{course.daysCount ?? "—"}회</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-muted mb-0.5">수강료</p>
              <p className="text-sm font-medium">{course.tuitionFee.toLocaleString()}원</p>
            </div>
          </div>

          {/* 정원 현황 */}
          <div className="bg-surface-1 rounded-lg px-4 py-3 mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-ink-secondary">정원</span>
              <span className="text-xs font-bold text-ink">
                {course.confirmedCount} / {course.capacity}명
              </span>
            </div>
            <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min((course.confirmedCount / course.capacity) * 100, 100)}%`,
                  backgroundColor: isFull ? "#16a34a" : "#f97316",
                }}
              />
            </div>
            {course.waitlistCount > 0 && (
              <p className="text-[10px] text-ink-muted mt-1">
                후보 대기 {course.waitlistCount}명
              </p>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">
              {error}
            </div>
          )}

          {/* 내 상태 표시 */}
          {isMyConfirmed && (
            <div className="badge-green mb-3 px-3 py-1.5 rounded-lg w-full justify-center">
              ✓ 수강 확정 {course.myRegistration?.myRank}번째
            </div>
          )}
          {isMyWaitlist && (
            <div className="badge-yellow mb-3 px-3 py-1.5 rounded-lg w-full justify-center">
              후보 {course.myRegistration?.waitlistOrder}번 대기 중
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            {!isMyConfirmed && !isMyWaitlist && isOpen && (
              <button
                onClick={handleRegister}
                disabled={isPending}
                className="btn-primary flex-1 justify-center py-2.5"
              >
                {isPending
                  ? "처리 중..."
                  : isFull
                  ? "후보 등록"
                  : "수강신청"}
              </button>
            )}
            {(isMyConfirmed || isMyWaitlist) && isOpen && (
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="btn-danger flex-1 justify-center py-2.5"
              >
                {isPending ? "처리 중..." : "취소"}
              </button>
            )}
            {!isOpen && (
              <div className="flex-1 text-center text-xs text-ink-muted py-2.5">
                {period?.state === "before" ? "수강신청 오픈 전" : "수강신청 마감"}
              </div>
            )}
            <button onClick={onClose} className="btn-secondary px-4">
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
