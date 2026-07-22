import { Resend } from "resend";

const FROM = "수강신청 시스템 <noreply@adagio.co.kr>";
const MAX_RETRIES = 3;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[EMAIL] RESEND_API_KEY 미설정 — 이메일 발송 건너뜀");
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendWithRetry(
  payload: Parameters<Resend["emails"]["send"]>[0],
  attempt = 1
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const { error } = await resend.emails.send(payload);
  if (error) {
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      return sendWithRetry(payload, attempt + 1);
    }
    console.error("[EMAIL] 최종 발송 실패:", error, payload.to);
  }
}

/** 이메일 주소: {사용자ID}@samsung.com */
const toEmail = (username: string) => `${username}@samsung.com`;

export async function sendPaymentUnpaidNotice(username: string, courseName: string) {
  return sendWithRetry({
    from: FROM,
    to: toEmail(username),
    subject: `[수강신청] ${courseName} 입금 미완료 안내`,
    text: `${courseName} 수업의 입금 기한이 지나 수강 확정이 취소되었습니다.\n문의사항은 동호회 담당자에게 연락해주세요.`,
  });
}

export async function sendApprovedNotice(username: string, grade: string) {
  const gradeText = grade === "REGULAR" ? "정회원" : "준회원";
  return sendWithRetry({
    from: FROM,
    to: toEmail(username),
    subject: "[아다지오] 회원 가입 승인 완료",
    text: `아다지오 ${gradeText} 가입이 승인되었습니다.\n수강신청 시스템에서 이번 달 수업을 확인해보세요.`,
  });
}

export async function sendRejectedNotice(username: string) {
  return sendWithRetry({
    from: FROM,
    to: toEmail(username),
    subject: "[아다지오] 회원 가입 거절 안내",
    text: `아다지오 회원 가입 신청이 거절되었습니다.\n문의사항은 동호회 담당자에게 연락해주세요.`,
  });
}

export async function sendWaitlistPromotedNotice(
  username: string,
  courseName: string,
  tuitionFee: number,
  bankInfo: string
) {
  return sendWithRetry({
    from: FROM,
    to: toEmail(username),
    subject: `[수강신청] ${courseName} 수강 확정 안내`,
    text: `${courseName} 수업의 수강이 확정되었습니다.\n수강료 ${tuitionFee.toLocaleString()}원을 아래 계좌로 입금해주세요.\n${bankInfo}`,
  });
}
