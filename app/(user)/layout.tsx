import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserNav } from "@/components/nav/user-nav";
import Link from "next/link";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  // JWT는 장기 캐시될 수 있으므로 DB에서 현재 상태 재확인
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, name: true },
  });

  if (!user || user.status !== "ACTIVE") {
    redirect("/pending?status=" + (user?.status ?? "REJECTED"));
  }

  // 긴급 공지 조회
  const urgentNotice = await prisma.notice.findFirst({
    where: { isActive: true, importance: "URGENT" },
    orderBy: { sortOrder: "desc" },
    select: { id: true, title: true },
  });

  return (
    <div className="min-h-screen bg-surface-0">
      <UserNav name={user.name ?? session.user.username} />
      {urgentNotice && (
        <div className="bg-red-600 text-white text-xs text-center px-4 py-2">
          <span className="font-bold mr-1">📢 긴급공지</span>
          <Link href="/notices" className="underline hover:no-underline">
            {urgentNotice.title}
          </Link>
        </div>
      )}
      <main className="max-w-[900px] mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
