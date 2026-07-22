"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/admin/members",     label: "회원 관리" },
  { href: "/admin/courses",     label: "수업 관리" },
  { href: "/admin/dashboard",   label: "수강신청 현황" },
  { href: "/admin/instructors", label: "강사 관리" },
  { href: "/admin/payout",      label: "강사 정산" },
  { href: "/admin/coupons",     label: "쿠폰 관리" },
  { href: "/admin/notices",     label: "공지 관리" },
  { href: "/admin/settings",    label: "시스템 설정" },
];

export function AdminNav({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <nav className="bg-ink text-white sticky top-0 z-50 flex items-stretch">
      {/* 로고 */}
      <div className="px-5 py-3.5 text-sm font-bold border-r border-white/10 flex items-center gap-1.5 whitespace-nowrap shrink-0">
        <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
        </svg>
        수강신청<span className="text-orange-500">관리자</span>
      </div>

      {/* 관리자 그룹 라벨 */}
      <div className="flex items-center px-3 text-[10px] font-bold text-white/30 tracking-widest whitespace-nowrap shrink-0 border-r border-white/10">
        관리자
      </div>

      {/* 탭 */}
      <div className="flex overflow-x-auto flex-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-3.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors
                ${active
                  ? "text-white border-orange-500"
                  : "text-white/60 border-transparent hover:text-white/90"
                }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* 사용자 정보 */}
      <div className="flex items-center gap-3 px-4 shrink-0">
        <span className="text-xs text-white/60 hidden sm:block">{name} (관리자)</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-[11px] text-white/50 hover:text-white/80 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </nav>
  );
}
