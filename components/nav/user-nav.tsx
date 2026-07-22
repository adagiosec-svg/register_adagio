"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/courses",  label: "수강신청 시간표" },
  { href: "/result",   label: "신청 결과" },
  { href: "/coupons",  label: "쿠폰 신청" },
  { href: "/special",  label: "Special 수업" },
  { href: "/mypage",   label: "마이페이지" },
  { href: "/notices",  label: "공지사항" },
];

export function UserNav({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <nav className="bg-ink text-white sticky top-0 z-50 flex items-stretch">
      {/* 로고 */}
      <div className="px-5 py-3.5 text-sm font-bold border-r border-white/10 flex items-center gap-1.5 whitespace-nowrap shrink-0">
        <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
        </svg>
        수강신청<span className="text-orange-500">시스템</span>
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
        <span className="text-xs text-white/60 hidden sm:block">{name}</span>
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
