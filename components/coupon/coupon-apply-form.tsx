"use client";

import { useState } from "react";

interface CouponApplication {
  id: string;
  couponType: "FULL" | "HALF";
  quantity: number;
  totalAmount: number;
  status: "PENDING" | "PROCESSED";
  appliedAt: string;
  validUntil: string | null;
}

interface Props {
  initialApplications: CouponApplication[];
  unitPriceFull: number;
  unitPriceHalf: number;
}

const TYPE_LABELS: Record<string, string> = {
  FULL: "Full 80분",
  HALF: "Half 40분",
};

export function CouponApplyForm({ initialApplications, unitPriceFull, unitPriceHalf }: Props) {
  const [applications, setApplications] = useState(initialApplications);
  const [couponType, setCouponType] = useState<"FULL" | "HALF">("FULL");
  const [quantity, setQuantity] = useState(1);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const unitPrice = couponType === "FULL" ? unitPriceFull : unitPriceHalf;
  const totalAmount = unitPrice * quantity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError("");
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponType, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다.");
        return;
      }
      setApplications((prev) => [data, ...prev]);
      setQuantity(1);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 신청 폼 */}
      <form onSubmit={handleSubmit} className="card space-y-4">
        <p className="text-sm font-bold text-ink">쿠폰 신청</p>

        {/* 쿠폰 종류 */}
        <div className="flex gap-2">
          {(["FULL", "HALF"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setCouponType(type)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                couponType === type
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-ink-secondary border-black/15 hover:border-ink/40"
              }`}
            >
              {TYPE_LABELS[type]}
              <span className="block text-[10px] mt-0.5 font-normal opacity-80">
                {(type === "FULL" ? unitPriceFull : unitPriceHalf).toLocaleString()}원/회
              </span>
            </button>
          ))}
        </div>

        {/* 수량 */}
        <div>
          <label className="text-xs text-ink-secondary mb-2 block">수량</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-full border border-black/20 text-ink hover:bg-surface-1 flex items-center justify-center text-lg font-light"
            >
              −
            </button>
            <span className="text-2xl font-bold text-ink w-10 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(10, q + 1))}
              className="w-9 h-9 rounded-full border border-black/20 text-ink hover:bg-surface-1 flex items-center justify-center text-lg font-light"
            >
              +
            </button>
            <span className="text-xs text-ink-muted ml-2">(최대 10회)</span>
          </div>
        </div>

        {/* 합계 */}
        <div className="flex justify-between items-baseline pt-1 border-t border-black/10">
          <span className="text-sm text-ink-secondary">납부 금액</span>
          <span className="text-xl font-bold text-ink">{totalAmount.toLocaleString()}원</span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <button type="submit" disabled={isPending} className="btn-primary w-full justify-center py-3">
          {isPending ? "신청 중..." : "쿠폰 신청하기"}
        </button>
      </form>

      {/* 신청 내역 */}
      <div>
        <p className="text-xs font-bold text-ink-muted tracking-wider mb-3">신청 내역</p>
        {applications.length === 0 ? (
          <div className="card text-center py-8 text-ink-muted text-sm">신청 내역이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {applications.map((app) => (
              <div key={app.id} className="card flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {TYPE_LABELS[app.couponType]} × {app.quantity}회
                  </p>
                  <p className="text-[10px] text-ink-muted mt-0.5">
                    {new Date(app.appliedAt).toLocaleDateString("ko-KR")} 신청
                    {app.validUntil && ` · ${new Date(app.validUntil).toLocaleDateString("ko-KR")}까지 유효`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-ink">{app.totalAmount.toLocaleString()}원</p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      app.status === "PROCESSED"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {app.status === "PROCESSED" ? "발급 완료" : "처리 대기"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
