import type { RegistrationResult, SystemConfigMap } from "@/types/api";

type UserGrade = "REGULAR" | "ASSOCIATE";

interface Props {
  registration: RegistrationResult;
  grade: UserGrade;
  config: SystemConfigMap;
}

export function PaymentInfo({ registration, grade, config }: Props) {
  const { course } = registration;
  const isAssociate = grade === "ASSOCIATE";
  const isConfirmed = registration.status === "CONFIRMED";

  if (!isConfirmed) return null;

  const tuitionBank = config.tuition_account_bank ?? "";
  const tuitionNumber = config.tuition_account_number ?? "";
  const tuitionHolder = config.tuition_account_holder ?? "";
  const clubFeeBank = config.club_account_bank ?? "";
  const clubFeeNumber = config.club_account_number ?? "";
  const clubFeeHolder = config.club_account_holder ?? "";
  const clubFeeAmount = Number(config.club_fee ?? 0);

  return (
    <div className="mt-3 space-y-2">
      {/* 수강료 */}
      <div className="bg-surface-1 rounded-xl p-4">
        <p className="text-[10px] font-bold text-ink-muted tracking-wider mb-2">수강료 납부</p>
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-sm text-ink-secondary">납부금액</span>
          <span className="text-base font-bold text-ink">
            {course.tuitionFee.toLocaleString()}원
          </span>
        </div>
        <div className="text-xs text-ink-muted space-y-0.5">
          <p>은행: {tuitionBank}</p>
          <p>계좌: {tuitionNumber}</p>
          <p>예금주: {tuitionHolder}</p>
        </div>
      </div>

      {/* 동호회비 — 준회원만 */}
      {isAssociate && clubFeeAmount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-[10px] font-bold text-amber-700 tracking-wider mb-2">동호회비 납부 (준회원)</p>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-sm text-ink-secondary">납부금액</span>
            <span className="text-base font-bold text-amber-800">
              {clubFeeAmount.toLocaleString()}원
            </span>
          </div>
          <div className="text-xs text-ink-muted space-y-0.5">
            <p>은행: {clubFeeBank}</p>
            <p>계좌: {clubFeeNumber}</p>
            <p>예금주: {clubFeeHolder}</p>
          </div>
        </div>
      )}
    </div>
  );
}
