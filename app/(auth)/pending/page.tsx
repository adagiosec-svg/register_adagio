import Link from "next/link";

const STATUS_INFO: Record<string, { icon: string; title: string; desc: string; color: string }> = {
  PENDING: {
    icon: "⏳",
    title: "가입신청 완료",
    desc: "관리자가 신청 내역을 검토한 후 승인 처리합니다.\n승인 완료 시 로그인이 가능합니다.",
    color: "bg-yellow-100 text-yellow-600",
  },
  DORMANT: {
    icon: "💤",
    title: "휴면 계정",
    desc: "계정이 휴면 상태입니다.\n담당자에게 연락하여 활성화 요청을 해주세요.",
    color: "bg-blue-100 text-blue-600",
  },
  REJECTED: {
    icon: "✗",
    title: "가입 거절",
    desc: "가입 신청이 거절되었습니다.\n자세한 사유는 담당자에게 문의해주세요.",
    color: "bg-red-100 text-red-600",
  },
  SUSPENDED: {
    icon: "🚫",
    title: "계정 정지",
    desc: "계정이 정지되었습니다.\n담당자에게 문의해주세요.",
    color: "bg-red-100 text-red-600",
  },
};

export default function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  return (
    <PendingContent searchParams={searchParams} />
  );
}

async function PendingContent({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "PENDING" } = await searchParams;
  const info = STATUS_INFO[status] ?? STATUS_INFO.PENDING;

  return (
    <div className="card w-full max-w-sm text-center">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl ${info.color}`}>
        {info.icon}
      </div>

      <h1 className="text-base font-bold text-ink mb-2">{info.title}</h1>
      <p className="text-xs text-ink-muted mb-6 leading-relaxed whitespace-pre-line">{info.desc}</p>

      <div className="bg-surface-1 rounded-lg px-4 py-3 text-xs text-ink-secondary mb-6">
        문의: 동호회 담당자에게 연락해주세요.
      </div>

      <Link href="/login" className="btn-secondary w-full justify-center py-2.5 text-sm">
        로그인 페이지로
      </Link>
    </div>
  );
}
