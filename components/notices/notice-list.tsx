"use client";

import { useState } from "react";

type Importance = "NORMAL" | "IMPORTANT" | "URGENT";

interface Notice {
  id: string;
  title: string;
  content: string;
  importance: Importance;
  createdAt: string;
}

interface Props {
  notices: Notice[];
}

const IMPORTANCE_STYLE: Record<Importance, { badge: string; border: string }> = {
  URGENT:    { badge: "bg-red-100 text-red-700",    border: "border-l-red-500" },
  IMPORTANT: { badge: "bg-yellow-100 text-yellow-700", border: "border-l-yellow-500" },
  NORMAL:    { badge: "bg-surface-1 text-ink-muted",  border: "border-l-transparent" },
};

const IMPORTANCE_LABEL: Record<Importance, string> = {
  URGENT:    "긴급",
  IMPORTANT: "중요",
  NORMAL:    "",
};

export function NoticeList({ notices }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(
    // 긴급/중요 공지는 기본 펼침
    notices.find((n) => n.importance !== "NORMAL")?.id ?? null
  );

  if (notices.length === 0) {
    return (
      <div className="card text-center py-12 text-ink-muted text-sm">
        공지사항이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notices.map((notice) => {
        const style = IMPORTANCE_STYLE[notice.importance];
        const label = IMPORTANCE_LABEL[notice.importance];
        const isExpanded = expandedId === notice.id;

        return (
          <div
            key={notice.id}
            className={`card border-l-4 ${style.border} overflow-hidden`}
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : notice.id)}
              className="w-full flex items-start justify-between gap-3 text-left"
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                {label && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold mt-0.5 flex-none ${style.badge}`}>
                    {label}
                  </span>
                )}
                <span className="text-sm font-medium text-ink leading-snug">{notice.title}</span>
              </div>
              <div className="flex items-center gap-2 flex-none">
                <span className="text-[10px] text-ink-muted">
                  {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
                </span>
                <svg
                  className={`w-4 h-4 text-ink-muted transition-transform flex-none ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-black/10 text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">
                {notice.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
