import type { NextAuthConfig } from "next-auth";

// Edge-safe config — bcrypt·prisma import 없음
// middleware.ts에서 이 파일만 사용하여 번들 크기 제한(1 MB) 회피
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [], // Credentials provider는 auth.ts에서만 등록
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as Record<string, unknown>).role;
        token.grade = (user as Record<string, unknown>).grade;
        token.username = (user as Record<string, unknown>).username;
        token.mateId = (user as Record<string, unknown>).mateId;
        token.status = (user as Record<string, unknown>).status;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.grade = token.grade as string | null;
      session.user.username = token.username as string;
      session.user.mateId = token.mateId as string | null;
      session.user.status = token.status as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
