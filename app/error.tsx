"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-4">
      <div className="card max-w-sm w-full text-center">
        <p className="text-3xl mb-4">⚠</p>
        <h1 className="text-base font-bold text-ink mb-2">오류가 발생했습니다</h1>
        <p className="text-sm text-ink-muted mb-6">
          일시적인 오류입니다. 잠시 후 다시 시도해주세요.
          {error.digest && (
            <span className="block text-[10px] text-ink-muted mt-1">오류 코드: {error.digest}</span>
          )}
        </p>
        <button onClick={reset} className="btn-primary w-full justify-center py-2.5">
          다시 시도
        </button>
      </div>
    </div>
  );
}
