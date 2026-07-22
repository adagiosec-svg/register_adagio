import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decryptPortalId, decryptPhone } from "@/lib/crypto";
import { MembersTable } from "@/components/admin/members-table";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      id: true,
      username: true,
      name: true,
      phoneEncrypted: true,
      phoneLast4: true,
      grade: true,
      status: true,
      mateId: true,
      portalIdEncrypted: true,
      createdAt: true,
      approvedAt: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  const members = users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    phone: decryptPhone(u.phoneEncrypted),
    phoneLast4: u.phoneLast4,
    grade: u.grade,
    status: u.status,
    mateId: u.mateId,
    portalId: u.portalIdEncrypted ? decryptPortalId(u.portalIdEncrypted) : null,
    createdAt: u.createdAt.toISOString(),
    approvedAt: u.approvedAt?.toISOString() ?? null,
  }));

  const pendingCount = members.filter((m) => m.status === "PENDING").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">회원 관리</h1>
        {pendingCount > 0 && (
          <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">
            승인 대기 {pendingCount}명
          </span>
        )}
      </div>
      <MembersTable initialMembers={members} />
    </div>
  );
}
