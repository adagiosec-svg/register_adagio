import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { UserStatus } from "@prisma/client";
import { checkLoginRateLimit, recordFailedLogin } from "./rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const username = credentials.username as string;

        // 15분 내 10회 실패 시 차단
        const allowed = await checkLoginRateLimit(username);
        if (!allowed) return null;

        const user = await prisma.user.findUnique({
          where: { username },
          select: {
            id: true,
            username: true,
            name: true,
            passwordHash: true,
            status: true,
            role: true,
            grade: true,
            mateId: true,
          },
        });

        if (!user) {
          await recordFailedLogin(username);
          return null;
        }

        // 승인된 상태(정회원·준회원)만 로그인 허용 (실패 기록 안 함 — 비밀번호 브루트포스 아님)
        if (user.status !== UserStatus.ACTIVE) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) {
          await recordFailedLogin(username);
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          grade: user.grade,
          mateId: user.mateId,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.grade = (user as any).grade;
        token.username = (user as any).username;
        token.mateId = (user as any).mateId;
        token.status = (user as any).status;
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
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
