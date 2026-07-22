import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminCouponsPanel } from "@/components/admin/coupons-panel";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const applications = await prisma.couponApplication.findMany({
    include: { user: { select: { name: true, username: true } }, usages: true },
    orderBy: { appliedAt: "desc" },
  });

  const apps = applications.map((a) => ({
    id: a.id,
    couponType: a.couponType as "FULL" | "HALF" | "SPECIAL",
    quantity: a.quantity,
    totalAmount: a.totalAmount,
    status: a.status as "PENDING" | "PROCESSED",
    appliedAt: a.appliedAt.toISOString(),
    validUntil: a.validUntil?.toISOString() ?? null,
    processedAt: a.processedAt?.toISOString() ?? null,
    user: a.user,
    usageCount: a.usages.length,
  }));

  const pendingCount = apps.filter((a) => a.status === "PENDING").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">쿠폰 관리</h1>
        {pendingCount > 0 && (
          <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1.5 rounded-full">
            처리 대기 {pendingCount}건
          </span>
        )}
      </div>
      <AdminCouponsPanel initialApplications={apps} />
    </div>
  );
}
