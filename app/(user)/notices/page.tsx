import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NoticeList } from "@/components/notices/notice-list";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const notices = await prisma.notice.findMany({
    where: { isActive: true },
    orderBy: [{ importance: "desc" }, { sortOrder: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, content: true, importance: true, createdAt: true },
  });

  const data = notices.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }));

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">공지사항</h1>
      <NoticeList notices={data} />
    </div>
  );
}
