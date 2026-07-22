"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";
import { buildGrid } from "@/lib/timetable";
import { CourseCard } from "./course-card";
import { CourseDetailModal } from "./course-detail-modal";
import type { CourseWithStats, RegistrationPeriodInfo } from "@/types/api";

interface Props {
  initialCourses: CourseWithStats[];
  period: RegistrationPeriodInfo | null;
}

export function TimetableGrid({ initialCourses, period }: Props) {
  const [courses, setCourses] = useState<CourseWithStats[]>(initialCourses);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [infoModal, setInfoModal] = useState<CourseWithStats | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const router = useRouter();

  // Pusher 실시간 구독
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;

    const pusher = new Pusher(key, { cluster });

    const channels = courses.map((course) => {
      const ch = pusher.subscribe(`course-${course.id}`);
      ch.bind("enrollment-updated", (data: { confirmedCount: number; waitlistCount: number }) => {
        setCourses((prev) =>
          prev.map((c) =>
            c.id === course.id
              ? { ...c, confirmedCount: data.confirmedCount, waitlistCount: data.waitlistCount }
              : c
          )
        );
      });
      return ch;
    });

    return () => {
      channels.forEach((ch) => ch.unbind_all());
      pusher.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOpen = period?.state === "open";

  const handleEnrolled = useCallback(
    (courseId: string, result: { id: string; status: string; waitlistOrder: number | null }) => {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? {
                ...c,
                myRegistration: {
                  id: result.id,
                  status: result.status as "CONFIRMED" | "WAITLIST",
                  waitlistOrder: result.waitlistOrder,
                  myRank: result.status === "CONFIRMED" ? c.confirmedCount + 1 : null,
                },
              }
            : c
        )
      );
    },
    []
  );

  const handleCancelled = useCallback((registrationId: string) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.myRegistration?.id === registrationId ? { ...c, myRegistration: null } : c
      )
    );
  }, []);

  function handleCardClick(course: CourseWithStats) {
    // 이미 내가 신청한 수업은 정보 모달만
    if (course.myRegistration) {
      setInfoModal(course);
      return;
    }
    if (isOpen) {
      // 신청 가능 기간: 선택/해제 토글
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(course.id)) next.delete(course.id);
        else next.add(course.id);
        return next;
      });
    } else {
      // 기간 외: 정보 모달
      setInfoModal(course);
    }
  }

  async function handleSubmit() {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    setSubmitErrors([]);

    const selected = courses.filter((c) => selectedIds.has(c.id));
    const errors: string[] = [];

    for (const course of selected) {
      try {
        const res = await fetch("/api/registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: course.id }),
        });
        const data = await res.json();
        if (res.ok) {
          handleEnrolled(course.id, data);
        } else {
          errors.push(`${course.name}: ${data.error ?? "오류"}`);
        }
      } catch {
        errors.push(`${course.name}: 네트워크 오류`);
      }
    }

    setIsSubmitting(false);
    setSelectedIds(new Set());

    if (errors.length > 0) {
      setSubmitErrors(errors);
    }

    // 신청 성공한 게 있으면 결과 페이지로 이동
    if (errors.length < selected.length) {
      router.push("/result");
    }
  }

  const { days, times: slots, grid } = buildGrid(courses);
  const periodState = period?.state ?? "before";

  // 20분 슬롯 → 행 index (0-based)
  const slotIndex: Record<string, number> = {};
  slots.forEach((s, i) => { slotIndex[s] = i; });

  // courseType → 행 스팬 (FULL=80분=4슬롯, HALF=40분=2슬롯)
  const getSpan = (courseType: string) => (courseType === "FULL" ? 4 : 2);

  const selectedCourses = courses.filter((c) => selectedIds.has(c.id));
  const totalAmount = selectedCourses.reduce((sum, c) => sum + c.tuitionFee, 0);

  if (courses.length === 0) {
    return (
      <div className="text-center py-16 text-ink-muted">
        <p className="text-sm">이번 달 수업이 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      {/* 수강신청 상태 배너 */}
      {period && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-xl text-xs font-medium text-center ${
            periodState === "open"
              ? "bg-green-50 text-green-700 border border-green-200"
              : periodState === "before"
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "bg-surface-1 text-ink-muted border border-black/10"
          }`}
        >
          {periodState === "open" && `수강신청 진행 중 · 수업 카드를 눌러 선택하세요`}
          {periodState === "before" && `수강신청 오픈 예정 · ${new Date(period.openAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
          {periodState === "closed" && "수강신청 마감"}
        </div>
      )}

      {/* 오류 메시지 */}
      {submitErrors.length > 0 && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-1">
          {submitErrors.map((e, i) => (
            <p key={i} className="text-xs text-red-700">{e}</p>
          ))}
        </div>
      )}

      {/* 시간표 그리드 */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div
          className="min-w-[320px]"
          style={{
            display: "grid",
            gridTemplateColumns: `3rem repeat(${days.length}, 1fr)`,
            gridTemplateRows: `2rem repeat(${slots.length}, 40px)`,
          }}
        >
          {/* 헤더 행 */}
          <div style={{ gridRow: 1, gridColumn: 1 }} />
          {days.map((day, di) => (            
            <div
              key={day}
              style={{ gridRow: 1, gridColumn: di + 2 }}
              className="flex items-center justify-center text-xs font-bold text-ink-secondary border-b border-black/10"
            >
              {day}
            </div>
          ))}

          {/* 20분 슬롯 배경 및 시간 레이블 */}
          {slots.map((slot, si) => {
            const isHour = slot.endsWith(":00");
            return (
              <Fragment key={`slot-${slot}`}>
                <div
                  style={{ gridRow: si + 2, gridColumn: 1 }}
                  className="flex items-start justify-end pr-2 pt-0.5"
                >
                  {isHour && (
                    <span className="text-[10px] text-ink-muted whitespace-nowrap leading-none">
                      {slot}
                    </span>
                  )}
                </div>
                {days.map((_, di) => (
                  <div
                    key={di}
                    style={{ gridRow: si + 2, gridColumn: di + 2 }}
                    className={isHour ? "border-t border-black/15" : "border-t border-black/5"}
                  />
                ))}
              </Fragment>
            );
          })}

          {/* 수업 카드 — 시작 슬롯 위치에서 duration 만큼 row span */}
          {slots.map((slot, si) =>
            days.map((day, di) =>
              (grid[slot]?.[day] ?? []).map((course) => (
                <div
                  key={course.id}
                  style={{
                    gridRow: `${si + 2} / span ${getSpan(course.courseType)}`,
                    gridColumn: di + 2,
                    zIndex: 10,
                    padding: "2px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <CourseCard
                    course={course}
                    periodState={periodState}
                    isSelected={selectedIds.has(course.id)}
                    onClick={() => handleCardClick(course)}
                    className="flex-1"
                  />
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* 선택된 수업 신청 바 */}
      {isOpen && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-black/10 px-4 py-3 shadow-lg">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-ink">{selectedIds.size}개 수업 선택됨</p>
                <p className="text-xs text-ink-muted">총 납부금액: {totalAmount.toLocaleString()}원</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="btn-secondary text-xs px-3 py-2"
                >
                  선택 취소
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn-primary text-sm px-5 py-2"
                >
                  {isSubmitting ? "신청 중..." : "신청하기"}
                </button>
              </div>
            </div>
            {/* 선택된 수업 목록 */}
            <div className="flex gap-1.5 flex-wrap">
              {selectedCourses.map((c) => (
                <span key={c.id} className="text-[10px] bg-surface-1 px-2 py-0.5 rounded-full text-ink-secondary">
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 정보 모달 (기간 외 또는 이미 등록된 수업) */}
      {infoModal && (
        <CourseDetailModal
          course={infoModal}
          period={period}
          onClose={() => setInfoModal(null)}
          onEnrolled={handleEnrolled}
          onCancelled={handleCancelled}
        />
      )}
    </>
  );
}
