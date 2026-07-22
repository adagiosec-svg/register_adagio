export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-4">
      {/* 로고 */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 text-xl font-bold text-ink">
          <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
          </svg>
          수강신청<span className="text-orange-500">시스템</span>
        </div>
        <p className="text-xs text-ink-muted mt-1">아다지오 동호회</p>
      </div>
      {children}
    </div>
  );
}
