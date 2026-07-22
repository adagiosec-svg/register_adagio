"use client";

import { getLevelColor } from "@/lib/timetable";
import type { RegistrationResult, SystemConfigMap } from "@/types/api";
import { CourseListCard } from "@/components/ui/course-list-card";

type UserGrade = "REGULAR" | "ASSOCIATE";

interface Props {
  results: RegistrationResult[];
  grade: UserGrade;
  config: SystemConfigMap;
}

export function ResultView({ results, grade, config }: Props) {
  if (results.length === 0) {
    return (
      <div className="text-center py-16 text-ink-muted">
        <p className="text-sm">신청한 수업이 없습니다.</p>
      </div>
    );
  }

  const confirmed = results.filter((r) => r.status === "CONFIRMED");
  const isAssociate = grade === "ASSOCIATE";
  const clubFeeAmount = isAssociate ? Number(config.club_fee ?? 0) : 0;
  const tuitionTotal = confirmed.reduce((sum, r) => sum + r.course.tuitionFee, 0);
  const grandTotal = tuitionTotal + clubFeeAmount;

  const tuitionBank = config.tuition_account_bank ?? "";
  const tuitionNumber = config.tuition_account_number ?? "";
  const tuitionHolder = config.tuition_account_holder ?? "";
  const clubBank = config.club_account_bank ?? "";
  const clubNumber = config.club_account_number ?? "";
  const clubHolder = config.club_account_holder ?? "";

  return (
    <div className="space-y-4">
      {/* 납부 안내 */}
      {confirmed.length > 0 && (
        <div className="card">
          <p className="text-[10px] font-bold text-ink-muted tracking-wider mb-3">수강료 납부</p>

          {/* 수업별 금액 */}
          <div className="space-y-2 mb-3">
            {confirmed.map((r) => (
              <div key={r.id} className="flex justify-between items-center">
                <span className="text-sm text-ink-secondary">{r.course.name}</span>
                <span className="text-sm font-medium text-ink">
                  {r.course.tuitionFee.toLocaleString()}원
                </span>
              </div>
            ))}
            {isAssociate && clubFeeAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-amber-700">동호회비 (준회원)</span>
                <span className="text-sm font-medium text-amber-800">
                  {clubFeeAmount.toLocaleString()}원
                </span>
              </div>
            )}
          </div>

          {/* 합계 */}
          <div className="border-t border-black/10 pt-3 flex justify-between items-baseline">
            <span className="text-sm font-bold text-ink">총 납부금액</span>
            <span className="text-xl font-bold text-ink">{grandTotal.toLocaleString()}원</span>
          </div>

          {/* 수강료 계좌 */}
          <div className="mt-3 bg-surface-1 rounded-xl px-4 py-3 text-xs space-y-0.5 text-ink-secondary">
            <p>
              <span className="text-ink-muted w-14 inline-block">은행</span>
              {tuitionBank}
            </p>
            <p>
              <span className="text-ink-muted w-14 inline-block">계좌</span>
              <span className="font-medium text-ink">{tuitionNumber}</span>
            </p>
            <p>
              <span className="text-ink-muted w-14 inline-block">예금주</span>
              {tuitionHolder}
            </p>
          </div>

          {/* 동호회비 계좌 (준회원, 별도 계좌인 경우) */}
          {isAssociate && clubFeeAmount > 0 && clubNumber && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs space-y-0.5 text-ink-secondary">
              <p className="text-[10px] font-bold text-amber-700 mb-1.5">동호회비 납부 계좌</p>
              <p>
                <span className="text-ink-muted w-14 inline-block">은행</span>
                {clubBank}
              </p>
              <p>
                <span className="text-ink-muted w-14 inline-block">계좌</span>
                <span className="font-medium text-ink">{clubNumber}</span>
              </p>
              <p>
                <span className="text-ink-muted w-14 inline-block">예금주</span>
                {clubHolder}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 신청 수업 목록 */}
      <div>
        <p className="text-xs font-bold text-ink-muted tracking-wider mb-2">신청 내역</p>
        <div className="space-y-2">
          {results.map((r) => {
            const isConfirmed = r.status === "CONFIRMED";
            return (
              <CourseListCard
                key={r.id}
                name={r.course.name}
                level={r.course.level}
                schedule={r.course.schedule}
                daysCount={r.course.daysCount}
                themeColor={r.course.instructor?.themeColor ?? getLevelColor(r.course.level).bg}
                trailing={
                  <div className="text-right">
                    {isConfirmed ? (
                      <>
                        <span className="text-sm font-bold text-green-700">
                          {r.course.tuitionFee.toLocaleString()}원
                        </span>
                        <p className="text-[10px] text-green-600 mt-0.5">
                          확정 · {r.myRank}번째 신청
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-ink-muted">—</span>
                        <p className="text-[10px] text-yellow-600 mt-0.5">
                          후보 {r.waitlistOrder}번
                        </p>
                      </>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
