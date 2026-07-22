"use client";

import { useState } from "react";

export function PasswordChangeForm() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess(false);
  }

  function handleToggle() {
    if (open) reset();
    setOpen((v) => !v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPassword.length < 6) {
      setError("새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("현재 비밀번호와 동일합니다.");
      return;
    }

    setIsPending(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "비밀번호 변경에 실패했습니다.");
      } else {
        setSuccess(true);
        reset();
        setTimeout(() => {
          setSuccess(false);
          setOpen(false);
        }, 2000);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ink">비밀번호</p>
          <p className="text-xs text-ink-muted mt-0.5">로그인 비밀번호를 변경합니다.</p>
        </div>
        <button
          onClick={handleToggle}
          className="btn-secondary text-xs px-3 py-1.5"
        >
          {open ? "취소" : "변경"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-black/10 space-y-3">
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded-lg">
              비밀번호가 변경되었습니다.
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="form-label text-xs">현재 비밀번호</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="input-text text-sm w-full"
            />
          </div>
          <div>
            <label className="form-label text-xs">새 비밀번호</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6자 이상"
              minLength={6}
              autoComplete="new-password"
              required
              className="input-text text-sm w-full"
            />
          </div>
          <div>
            <label className="form-label text-xs">새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="input-text text-sm w-full"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
            className="btn-primary text-sm w-full py-2 justify-center"
          >
            {isPending ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      )}
    </div>
  );
}
