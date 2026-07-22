import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const USER_ROUTES = ["/courses", "/result", "/mypage", "/coupons", "/special", "/notices"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === "ADMIN";
  const userStatus = req.auth?.user?.status;

  // 관리자 전용 경로
  if (pathname.startsWith("/admin")) {
    if (!isAdmin) return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.next();
  }

  // 관리자가 일반 사용자 경로 접근 시 관리자 대시보드로 리다이렉트
  // /login, /register는 예외 (로그아웃 후 재로그인 가능하도록)
  if (isAdmin && !pathname.startsWith("/api") && pathname !== "/login" && pathname !== "/register") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  // 인증 필요 경로
  const needsAuth = USER_ROUTES.some((r) => pathname.startsWith(r));
  if (needsAuth && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 비활성 회원 (DORMANT/REJECTED/SUSPENDED) — 로그인 상태여도 차단
  if (isLoggedIn && needsAuth && userStatus && userStatus !== "ACTIVE") {
    return NextResponse.redirect(new URL("/pending?status=" + userStatus, req.url));
  }

  // 이미 로그인된 사용자가 로그인/가입 페이지 접근 시
  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const response = NextResponse.next();
  // 기본 보안 헤더
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
});

export const config = {
  matcher: [
    "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico).*)",
  ],
};
