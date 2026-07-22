import { prisma } from "./prisma";
import { decryptSensitiveOptional } from "./crypto";

export type ConfigKey =
  | "tuition_full_1"
  | "tuition_full_3"
  | "tuition_full_4"
  | "tuition_half_1"
  | "tuition_half_3"
  | "tuition_half_4"
  | "instructor_fee_rate_full"
  | "instructor_fee_rate_half"
  | "club_fee"
  | "course_levels"
  | "tuition_account_bank"
  | "tuition_account_number"
  | "tuition_account_holder"
  | "club_account_bank"
  | "club_account_number"
  | "club_account_holder";

/** 계좌번호/은행 등 민감 설정 키 목록 — 읽을 때 복호화, 쓸 때 암호화 */
export const SENSITIVE_CONFIG_KEYS = new Set<string>([
  "tuition_account_bank",
  "tuition_account_number",
  "tuition_account_holder",
  "club_account_bank",
  "club_account_number",
  "club_account_holder",
]);

function decryptConfigValue(key: string, value: string): string {
  if (SENSITIVE_CONFIG_KEYS.has(key)) {
    return decryptSensitiveOptional(value) ?? value;
  }
  return value;
}

export async function getConfig(key: ConfigKey): Promise<string | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) return null;
  return decryptConfigValue(key, row.value);
}

export async function getAllConfig(): Promise<Record<string, string>> {
  const rows = await prisma.systemConfig.findMany();
  return Object.fromEntries(
    rows.map((r) => [r.key, decryptConfigValue(r.key, r.value)])
  );
}

/** 수강료 자동계산: 횟수별 고정금액 조회 */
export function calcTuitionFee(
  config: Record<string, string>,
  courseType: "FULL" | "HALF",
  daysCount: number
): number {
  const key = `tuition_${courseType.toLowerCase()}_${daysCount}`;
  return Number(config[key] ?? 0);
}

/** 강사료 자동계산: 타입별 단가 × 월 진행 횟수 */
export function calcInstructorFee(
  ratePerSession: number,
  daysCount: number
): number {
  return ratePerSession * daysCount;
}
