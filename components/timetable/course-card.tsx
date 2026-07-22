import { getLevelColor } from "@/lib/timetable";
import type { CourseWithStats } from "@/types/api";

interface Props {
  course: CourseWithStats;
  periodState: "before" | "open" | "closed";
  isSelected?: boolean;
  onClick: () => void;
  className?: string;
}

function calcEndTime(startTime: string, type: string): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + (type === "FULL" ? 80 : 40);
  return `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, "0")}`;
}

export function CourseCard({ course, periodState, isSelected = false, onClick, className = "" }: Props) {
  const { bg, text } = getLevelColor(course.level);
  const isFull = course.confirmedCount >= course.capacity;
  const isMyConfirmed = course.myRegistration?.status === "CONFIRMED";
  const isMyWaitlist = course.myRegistration?.status === "WAITLIST";
  const isOpen = periodState === "open";

  const startTime = course.schedule.split(" ")[1] ?? "";
  const endTime = startTime ? calcEndTime(startTime, course.courseType) : "";

  const capacityPct = (course.confirmedCount / course.capacity) * 100;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={`rounded-lg p-2 cursor-pointer transition-all select-none relative ${className}`}
      style={{
        backgroundColor: bg,
        // borderLeft: `3px solid ${course.instructor?.themeColor ?? "#9ca3af"}`,
        outline: isSelected
          ? "3px solid #1a1a18"
          : isMyConfirmed
          ? `3px solid ${course.instructor?.themeColor ?? "#1a1a18"}`
          : undefined,
        outlineOffset: "1px",
        opacity: isFull && !isMyConfirmed && !isMyWaitlist && !isSelected ? 0.7 : 1,
      }}
    >
      {/* 선택 체크 */}
      {isSelected && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-ink rounded-full flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        </div>
      )}

      {/* 인원 / 시간 */}
      <div className="flex justify-between items-center mb-1">
        <span
          className="text-[10px] font-bold"
          style={{ color: isFull && isOpen ? "#dc2626" : text }}
        >
          {course.confirmedCount} / {course.capacity}
        </span>
        <span className="text-[10px]" style={{ color: text }}>
          {startTime}{endTime ? `~${endTime}` : ""}
        </span>
      </div>

      {/* 수업명 */}
      <div className="text-[11px] font-medium mb-0.5 leading-tight" style={{ color: text }}>
        {course.name}
      </div>

      {/* 강사명 */}
      {(course.instructor?.name ?? course.instructorNameText) && (
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full flex-none"
            style={{ backgroundColor: course.instructor?.themeColor ?? "#9ca3af" }}
          />
          <div className="text-[10px] leading-tight" style={{ color: text, opacity: 0.7 }}>
            {course.instructor?.name ?? course.instructorNameText}
          </div>
        </div>
      )}

      {/* 하단 배지 */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className={course.courseType === "FULL" ? "chip-full" : "chip-half"}>
          {course.courseType === "FULL" ? "Full" : "Half"}
        </span>

        {isFull && !isMyConfirmed && (
          <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
            마감
          </span>
        )}
        {isMyConfirmed && (
          <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">
            ✓ 나
          </span>
        )}
        {isMyWaitlist && (
          <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
            대기 {course.myRegistration?.waitlistOrder}번
          </span>
        )}
      </div>

      {/* 잔여석 바 */}
      <div className="mt-1.5 h-0.5 rounded-full bg-black/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(capacityPct, 100)}%`,
            backgroundColor: isFull ? "#16a34a" : capacityPct >= 80 ? "#f59e0b" : text,
          }}
        />
      </div>
    </div>
  );
}
