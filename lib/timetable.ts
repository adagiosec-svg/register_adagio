const DAY_MAP: Record<string, string> = {
  월요일: "월", 화요일: "화", 수요일: "수",
  목요일: "목", 금요일: "금", 토요일: "토", 일요일: "일",
};

export const DAY_ORDER = ["월", "화", "수", "목", "금", "토", "일"];

/** "화요일 19:00" → { day: "화", time: "19:00" } */
export function parseSchedule(schedule: string): { day: string; time: string } | null {
  const match = schedule.match(
    /^(월요일|화요일|수요일|목요일|금요일|토요일|일요일)\s+(\d{1,2}:\d{2})/
  );
  if (!match) return null;
  return { day: DAY_MAP[match[1]], time: match[2] };
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toTimeStr = (min: number) =>
  `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

/** 코스 배열로부터 요일×시간 그리드를 빌드 (20분 단위 슬롯) */
export function buildGrid<T extends { schedule: string; courseType: string }>(courses: T[]): {
  days: string[];
  times: string[];
  grid: Record<string, Record<string, T[]>>;
} {
  const parsed = courses
    .map((c) => ({ course: c, parsed: parseSchedule(c.schedule) }))
    .filter((x): x is { course: T; parsed: { day: string; time: string } } => x.parsed !== null);

  if (parsed.length === 0) return { days: [], times: [], grid: {} };

  const days = [...new Set(parsed.map((x) => x.parsed.day))].sort(
    (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)
  );

  // 시작·종료 범위 계산
  const startMins = parsed.map((x) => toMinutes(x.parsed.time));
  const endMins = parsed.map((x) => {
    const dur = x.course.courseType === "FULL" ? 80 : 40;
    return toMinutes(x.parsed.time) + dur;
  });
  const minStart = Math.min(...startMins);
  const maxEnd = Math.max(...endMins);

  // 20분 단위 슬롯 생성
  const times: string[] = [];
  for (let t = minStart; t < maxEnd; t += 20) {
    times.push(toTimeStr(t));
  }

  // 각 슬롯에서 시작하는 수업만 매핑
  const grid: Record<string, Record<string, T[]>> = {};
  for (const time of times) {
    grid[time] = {};
    for (const day of days) {
      grid[time][day] = parsed
        .filter((x) => x.parsed.time === time && x.parsed.day === day)
        .map((x) => x.course);
    }
  }
  return { days, times, grid };
}

/** 수업 레벨 → 배경색 / 텍스트색 */
export const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  입문:    { bg: "#dbeafe", text: "#1d4ed8" },
  "Lev 0.5": { bg: "#a7f3d0", text: "#065f46" },
  "Lev 1":   { bg: "#fef08a", text: "#713f12" },
  "Lev 1.5": { bg: "#fed7aa", text: "#9a3412" },
  "Lev 2":   { bg: "#f9a8d4", text: "#831843" },
  "Lev 2+":  { bg: "#e9d5ff", text: "#5b21b6" },
  Special:   { bg: "#e5e7eb", text: "#6b7280" },
};

export function getLevelColor(level: string | null) {
  if (!level) return { bg: "#f3f4f6", text: "#9ca3af" };
  return LEVEL_COLORS[level] ?? { bg: "#f3f4f6", text: "#9ca3af" };
}
