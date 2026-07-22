"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type FieldError = { [k: string]: string };

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError>({});
  const [serverError, setServerError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [phone, setPhone] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError("");
    setIsPending(true);

    const form = e.currentTarget;
    const data = {
      username: (form.elements.namedItem("username") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      phone,
      portalId: (form.elements.namedItem("portalId") as HTMLInputElement).value,
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "오류가 발생했습니다.");
      } else {
        router.push("/pending");
      }
    } catch {
      setServerError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="card w-full max-w-md">
      <h1 className="text-lg font-bold text-ink mb-1">가입신청</h1>
      <p className="text-xs text-ink-muted mb-6">
        관리자 승인 후 수강신청이 가능합니다.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
            {serverError}
          </div>
        )}

        {/* 아이디 */}
        <div>
          <label className="form-label" htmlFor="username">
            로그인 아이디 <span className="text-red-500">*</span>
          </label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="영문/숫자 4~20자"
            pattern="[a-zA-Z0-9]{4,20}"
            autoComplete="username"
            required
          />
          <p className="form-note">사내 포탈 ID와 다른, 이 시스템 전용 ID를 입력하세요.</p>
        </div>

        {/* 비밀번호 */}
        <div>
          <label className="form-label" htmlFor="password">
            비밀번호 <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="6자 이상"
            minLength={6}
            autoComplete="new-password"
            required
          />
        </div>

        {/* 이름 / 전화번호 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label" htmlFor="name">
              이름 <span className="text-red-500">*</span>
            </label>
            <input id="name" name="name" type="text" placeholder="홍길동" required />
          </div>
          <div>
            <label className="form-label" htmlFor="phone">
              전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="스튜디오메이트 등록 연락처"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              maxLength={13}
              required
            />
          </div>
        </div>

        {/* 사내 포탈 ID */}
        <div>
          <label className="form-label" htmlFor="portalId">
            사내 포탈 ID <span className="text-red-500">*</span>
          </label>
          <input
            id="portalId"
            name="portalId"
            type="text"
            placeholder="Knox ID"
            required
          />
          <p className="form-note">
            관리자 승인 및 Studio Mate 연동에만 사용됩니다. 암호화 저장되며 로그인에 사용되지 않습니다.
          </p>
        </div>

        <button type="submit" disabled={isPending} className="btn-primary justify-center w-full py-2.5 mt-1">
          {isPending ? "신청 중..." : "가입신청"}
        </button>
      </form>

      <hr className="border-black/[0.08] my-5" />
      <p className="text-xs text-ink-muted text-center">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-accent hover:underline font-medium">
          로그인
        </Link>
      </p>
    </div>
  );
}
