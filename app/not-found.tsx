import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <p className="text-5xl font-black text-ink/10 mb-4">404</p>
        <h1 className="text-base font-bold text-ink mb-2">페이지를 찾을 수 없습니다</h1>
        <p className="text-sm text-ink-muted mb-6">요청하신 페이지가 존재하지 않거나 이동됐습니다.</p>
        <Link href="/" className="btn-primary px-5 py-2.5">
          홈으로
        </Link>
      </div>
    </div>
  );
}
