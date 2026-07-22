import Pusher from "pusher";
import PusherJs from "pusher-js";

// 서버 측 (API Route에서 이벤트 발행)
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// 클라이언트 측 (브라우저에서 구독)
export const getPusherClient = () =>
  new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  });

// 채널 이름 규칙
export const CHANNELS = {
  /** 수업별 실시간 정원 현황 */
  course: (courseId: string) => `course-${courseId}`,
  /** 사용자별 후보 순위 변동 알림 */
  user: (userId: string) => `private-user-${userId}`,
} as const;

export const EVENTS = {
  ENROLLMENT_UPDATED: "enrollment-updated", // { confirmedCount, waitlistCount }
  WAITLIST_PROMOTED: "waitlist-promoted",    // 후보 → 확정 전환 알림
  PERIOD_OPENED: "period-opened",            // 수강신청 오픈
  PERIOD_CLOSED: "period-closed",            // 수강신청 마감
} as const;
