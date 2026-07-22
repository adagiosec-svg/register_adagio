"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginAction, null);

  return (
    <div className="card w-full max-w-sm">
      <h1 className="text-lg font-bold text-ink mb-1">로그인</h1>
      <p className="text-xs text-ink-muted mb-6">수강신청 시스템에 오신 것을 환영합니다.</p>

      <form action={action} className="flex flex-col gap-4">
        {state?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
            {state.error}
          </div>
        )}

        <div>
          <label className="form-label" htmlFor="username">아이디</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="로그인 아이디"
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label className="form-label" htmlFor="password">비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="비밀번호"
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" disabled={isPending} className="btn-primary justify-center w-full py-2.5 mt-1">
          {isPending ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <hr className="border-black/[0.08] my-5" />

      <p className="text-xs text-ink-muted text-center">
        계정이 없으신가요?{" "}
        <Link href="/register" className="text-accent hover:underline font-medium">
          가입신청
        </Link>
      </p>
    </div>
  );
}
