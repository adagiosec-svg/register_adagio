"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserStatus = "PENDING" | "ACTIVE" | "DORMANT" | "REJECTED" | "SUSPENDED";
type UserGrade = "REGULAR" | "ASSOCIATE";

interface Member {
  id: string;
  username: string;
  name: string;
  phone: string;      // 서버에서 복호화된 전체 번호
  phoneLast4: string; // 마스킹 표시용 뒤 4자리
  grade: UserGrade | null;
  status: UserStatus;
  mateId: string | null;
  portalId: string | null;
  createdAt: string;
  approvedAt: string | null;
}

interface Props {
  initialMembers: Member[];
}

const STATUS_LABEL: Record<UserStatus, { label: string; cls: string }> = {
  PENDING:   { label: "승인 대기", cls: "bg-yellow-100 text-yellow-700" },
  ACTIVE:    { label: "활성",     cls: "bg-green-100 text-green-700" },
  DORMANT:   { label: "휴면",     cls: "bg-blue-100 text-blue-700" },
  REJECTED:  { label: "거절",     cls: "bg-red-100 text-red-700" },
  SUSPENDED: { label: "정지",     cls: "bg-red-100 text-red-700" },
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "전체" },
  { value: "PENDING",   label: "승인 대기" },
  { value: "ACTIVE",    label: "활성" },
  { value: "DORMANT",   label: "휴면" },
  { value: "SUSPENDED", label: "정지" },
];

interface RegEntry {
  id: string;
  status: string;
  waitlistOrder: number | null;
  paymentStatus: string;
  registeredAt: string;
  course?: { name: string; schedule: string; courseType: string; level: string | null; tuitionFee: number };
  specialCourse?: { name: string; sessionAt: string; tuitionFee: number };
}

interface MemberRegs {
  yearMonth: string;
  regular: RegEntry[];
  special: RegEntry[];
}

export function MembersTable({ initialMembers }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveData, setApproveData] = useState({ mateId: "", grade: "REGULAR" as UserGrade });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [regsCache, setRegsCache] = useState<Record<string, MemberRegs>>({});
  const [regsLoading, setRegsLoading] = useState<string | null>(null);
  const [cancellingRegId, setCancellingRegId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteMember(id: string) {
    if (!confirm("회원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "삭제 실패"); return; }
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError("네트워크 오류");
    } finally {
      setDeletingId(null);
    }
  }

  async function cancelMemberReg(memberId: string, regId: string) {
    if (!confirm("수강신청을 취소하시겠습니까?")) return;
    setCancellingRegId(regId);
    try {
      await fetch(`/api/admin/registrations/${regId}/cancel`, { method: "POST" });
      // 캐시 무효화 후 재조회
      setRegsCache((c) => { const next = { ...c }; delete next[memberId]; return next; });
      router.refresh();
      // 재조회
      const res = await fetch(`/api/admin/members/${memberId}/registrations`);
      if (res.ok) {
        const data = await res.json();
        setRegsCache((c) => ({ ...c, [memberId]: data }));
      }
    } finally {
      setCancellingRegId(null);
    }
  }

  async function toggleExpand(memberId: string) {
    if (expandedId === memberId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(memberId);
    if (regsCache[memberId]) return;
    setRegsLoading(memberId);
    try {
      const res = await fetch(`/api/admin/members/${memberId}/registrations`);
      if (res.ok) {
        const data = await res.json();
        setRegsCache((c) => ({ ...c, [memberId]: data }));
      }
    } finally {
      setRegsLoading(null);
    }
  }

  const filtered = members.filter((m) => {
    if (filterStatus && m.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        m.phone.includes(q)
      );
    }
    return true;
  });

  async function patchMember(id: string, body: object) {
    setPendingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "오류"); return false; }
      return true;
    } catch {
      setError("네트워크 오류");
      return false;
    } finally {
      setPendingId(null);
    }
  }

  async function handleApprove(id: string) {
    const ok = await patchMember(id, {
      action: "approve",
      mateId: approveData.mateId.trim(),
      grade: approveData.grade,
    });
    if (ok) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, status: "ACTIVE", grade: approveData.grade, mateId: approveData.mateId.trim(), approvedAt: new Date().toISOString() }
            : m
        )
      );
      setApprovingId(null);
      setApproveData({ mateId: "", grade: "REGULAR" });
    }
  }

  async function handleStatusChange(id: string, action: string) {
    const statusMap: Record<string, UserStatus> = {
      reject: "REJECTED",
      suspend: "SUSPENDED",
      activate: "ACTIVE",
      dormant: "DORMANT",
    };
    const ok = await patchMember(id, { action });
    if (ok) {
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: statusMap[action] ?? m.status } : m))
      );
    }
  }

  return (
    <div>
      {/* 필터 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === f.value ? "bg-ink text-white" : "bg-surface-1 text-ink-secondary hover:bg-black/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 / ID / 전화번호 검색"
          className="input-text flex-1 min-w-[180px] text-sm"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">
          {error}
        </div>
      )}

      <div className="text-xs text-ink-muted mb-2">{filtered.length}명</div>

      <div className="space-y-2">
        {filtered.map((m) => {
          const st = STATUS_LABEL[m.status];
          const isApproving = approvingId === m.id;
          const isLoading = pendingId === m.id;
          const isExpanded = expandedId === m.id;
          const regs = regsCache[m.id];

          return (
            <div key={m.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => toggleExpand(m.id)}
                      className="text-sm font-bold text-ink hover:text-accent transition-colors text-left"
                    >
                      {m.name}
                      <span className="ml-1 text-[10px] text-ink-muted font-normal">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </button>
                    <span className="text-xs text-ink-muted">{m.username}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                    {m.grade && (
                      <span className="text-[10px] bg-surface-1 text-ink-muted px-2 py-0.5 rounded-full">
                        {m.grade === "REGULAR" ? "정회원" : "준회원"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    {m.phone}
                    {m.mateId && ` · MateID: ${m.mateId}`}
                    {m.portalId && ` · 포탈ID: ${m.portalId}`}
                  </p>
                  <p className="text-[10px] text-ink-muted mt-0.5">
                    가입 {new Date(m.createdAt).toLocaleDateString("ko-KR")}
                    {m.approvedAt && ` · 승인 ${new Date(m.approvedAt).toLocaleDateString("ko-KR")}`}
                  </p>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-1.5 flex-none">
                  {m.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => setApprovingId(isApproving ? null : m.id)}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => handleStatusChange(m.id, "reject")}
                        disabled={isLoading}
                        className="btn-danger text-xs px-3 py-1.5"
                      >
                        거절
                      </button>
                    </>
                  )}
                  {m.status === "ACTIVE" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(m.id, "dormant")}
                        disabled={isLoading}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        휴면
                      </button>
                      <button
                        onClick={() => handleStatusChange(m.id, "suspend")}
                        disabled={isLoading}
                        className="btn-danger text-xs px-3 py-1.5"
                      >
                        정지
                      </button>
                    </>
                  )}
                  {(m.status === "DORMANT" || m.status === "SUSPENDED") && (
                    <button
                      onClick={() => handleStatusChange(m.id, "activate")}
                      disabled={isLoading}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      활성화
                    </button>
                  )}
                  {(m.status === "DORMANT" || m.status === "REJECTED") && (
                    <button
                      onClick={() => deleteMember(m.id)}
                      disabled={deletingId === m.id}
                      className="btn-danger text-xs px-3 py-1.5"
                    >
                      {deletingId === m.id ? "삭제 중..." : "삭제"}
                    </button>
                  )}
                </div>
              </div>

              {/* 승인 인라인 폼 */}
              {isApproving && (
                <div className="mt-3 pt-3 border-t border-black/10 flex gap-2 flex-wrap items-end">
                  <div>
                    <label className="text-[10px] text-ink-muted block mb-1">Studio Mate ID</label>
                    <input
                      type="text"
                      value={approveData.mateId}
                      onChange={(e) => setApproveData((d) => ({ ...d, mateId: e.target.value }))}
                      placeholder="MateID"
                      className="input-text text-sm w-36"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-ink-muted block mb-1">등급</label>
                    <select
                      value={approveData.grade}
                      onChange={(e) => setApproveData((d) => ({ ...d, grade: e.target.value as UserGrade }))}
                      className="input-text text-sm"
                    >
                      <option value="REGULAR">정회원</option>
                      <option value="ASSOCIATE">준회원</option>
                    </select>
                  </div>
                  <button
                    onClick={() => handleApprove(m.id)}
                    disabled={isLoading || !approveData.mateId.trim()}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    {isLoading ? "처리 중..." : "승인 확정"}
                  </button>
                  <button
                    onClick={() => setApprovingId(null)}
                    className="btn-secondary text-xs px-3 py-2"
                  >
                    취소
                  </button>
                </div>
              )}

              {/* 이번달 신청 내역 */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-black/10">
                  {regsLoading === m.id ? (
                    <p className="text-[11px] text-ink-muted">불러오는 중...</p>
                  ) : regs ? (
                    <>
                      <p className="text-[10px] font-bold text-ink-muted tracking-wider mb-2">
                        {regs.yearMonth} 신청 내역
                      </p>
                      {regs.regular.length === 0 && regs.special.length === 0 ? (
                        <p className="text-[11px] text-ink-muted">신청 내역 없음</p>
                      ) : (
                        <div className="space-y-1.5">
                          {regs.regular.map((r) => (
                            <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-1 text-xs">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-ink">{r.course?.name}</span>
                                <span className="ml-2 text-ink-muted">{r.course?.schedule}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-none">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  r.status === "CONFIRMED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                }`}>
                                  {r.status === "CONFIRMED" ? "확정" : `후보 ${r.waitlistOrder}번`}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  r.paymentStatus === "PAID" ? "bg-blue-100 text-blue-700" : "bg-surface-1 text-ink-muted"
                                }`}>
                                  {r.paymentStatus === "PAID" ? "납부" : "미납"}
                                </span>
                                <button
                                  onClick={() => cancelMemberReg(m.id, r.id)}
                                  disabled={cancellingRegId === r.id}
                                  className="text-[10px] text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-100 transition-colors"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ))}
                          {regs.special.map((r) => (
                            <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-1 text-xs">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-ink">[Special] {r.specialCourse?.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-none">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  r.status === "CONFIRMED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                }`}>
                                  {r.status === "CONFIRMED" ? "확정" : `후보 ${r.waitlistOrder}번`}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  r.paymentStatus === "PAID" ? "bg-blue-100 text-blue-700" : "bg-surface-1 text-ink-muted"
                                }`}>
                                  {r.paymentStatus === "PAID" ? "납부" : "미납"}
                                </span>
                                <button
                                  onClick={() => cancelMemberReg(m.id, r.id)}
                                  disabled={cancellingRegId === r.id}
                                  className="text-[10px] text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-100 transition-colors"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
