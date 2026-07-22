import { Fragment } from "react";

interface CourseListCardProps {
  name: string;
  courseType?: string | null;
  level?: string | null;
  schedule?: string | null;
  daysCount?: number | null;
  instructorName?: string | null;
  themeColor?: string | null;
  confirmedCount?: number;
  capacity?: number;
  waitlistCount?: number;
  tuitionFee?: number;
  paidCount?: number;
  unpaidCount?: number;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function CourseListCard({
  name,
  courseType,
  level,
  schedule,
  daysCount,
  instructorName,
  themeColor,
  confirmedCount,
  capacity,
  waitlistCount,
  tuitionFee,
  paidCount,
  unpaidCount,
  trailing,
  children,
  onClick,
}: CourseListCardProps) {
  const color = themeColor ?? "#9ca3af";

  const metaParts: React.ReactNode[] = [];
  if (schedule) metaParts.push(schedule);
  if (daysCount) metaParts.push(`${daysCount}회`);
  if (instructorName != null) metaParts.push(`강사: ${instructorName}`);
  if (confirmedCount !== undefined && capacity !== undefined)
    metaParts.push(`정원 ${confirmedCount}/${capacity}`);
  if (waitlistCount) metaParts.push(`후보 ${waitlistCount}명`);
  if (tuitionFee !== undefined) metaParts.push(`${tuitionFee.toLocaleString()}원`);
  if (paidCount !== undefined)
    metaParts.push(
      <span key="paid" className="text-green-600">
        입금 {paidCount}명
      </span>
    );
  if (unpaidCount !== undefined && unpaidCount > 0)
    metaParts.push(
      <span key="unpaid" className="text-red-600">
        미완료 {unpaidCount}명
      </span>
    );

  const header = (
    <div className="flex items-center gap-3">
      <div
        className="w-1 self-stretch rounded-full flex-none"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-ink">{name}</span>
          {level && (
            <span className="text-[10px] bg-surface-1 text-ink-muted px-1.5 py-0.5 rounded">
              {level}
            </span>
          )}
          {courseType && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                courseType === "FULL"
                  ? "chip-full"
                  : courseType === "HALF"
                  ? "chip-half"
                  : "bg-surface-1 text-ink-muted"
              }`}
            >
              {courseType}
            </span>
          )}
        </div>
        {metaParts.length > 0 && (
          <p className="text-xs text-ink-muted mt-0.5">
            {metaParts.map((part, i) => (
              <Fragment key={i}>
                {i > 0 && " · "}
                {part}
              </Fragment>
            ))}
          </p>
        )}
      </div>
      {trailing !== undefined && <div className="flex-none">{trailing}</div>}
    </div>
  );

  return (
    <div className="card overflow-hidden">
      {onClick ? (
        <button onClick={onClick} className="w-full text-left">
          {header}
        </button>
      ) : (
        header
      )}
      {children}
    </div>
  );
}
