import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NoticesPanel } from "@/components/admin/notices-panel";

export const dynamic = "force-dynamic";

export default async function AdminNoticesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const notices = await prisma.notice.findMany({
    orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
  });

  const data = notices.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    importance: n.importance,
    sortOrder: n.sortOrder,
    isActive: n.isActive,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">공지 관리</h1>
      <NoticesPanel initialNotices={data} />
    </div>
  );
}
