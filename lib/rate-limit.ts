import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000; // 15분
const MAX_ATTEMPTS = 10;
const CLEANUP_AFTER_MS = 60 * 60 * 1000; // 1시간 이상 된 기록 삭제

/**
 * 해당 username의 최근 15분 실패 횟수를 확인.
 * MAX_ATTEMPTS 미만이면 true(허용), 이상이면 false(차단).
 */
export async function checkLoginRateLimit(username: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const count = await prisma.loginAttempt.count({
    where: { username, attemptedAt: { gte: windowStart } },
  });
  return count < MAX_ATTEMPTS;
}

/**
 * 로그인 실패를 기록한다. 오래된 기록은 비동기로 정리.
 */
export async function recordFailedLogin(username: string): Promise<void> {
  await prisma.loginAttempt.create({ data: { username } });
  // 오래된 기록 비동기 정리 (실패해도 무관)
  prisma.loginAttempt
    .deleteMany({ where: { attemptedAt: { lt: new Date(Date.now() - CLEANUP_AFTER_MS) } } })
    .catch(() => {});
}
