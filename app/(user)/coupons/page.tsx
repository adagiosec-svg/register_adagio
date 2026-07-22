import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAllConfig } from "@/lib/system-config";
import { CouponApplyForm } from "@/components/coupon/coupon-apply-form";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // 내 신청 내역
  const applications = await prisma.couponApplication.findMany({
    where: { userId: session.user.id },
    include: { usages: true },
    orderBy: { appliedAt: "desc" },
  });

  // 1회 쿠폰 단가
  const config = await getAllConfig();
  const unitPriceFull = Number(config.tuition_full_1 ?? 0);
  const unitPriceHalf = Number(config.tuition_half_1 ?? 0);

  const serialized = applications.map((app) => ({
    id: app.id,
    couponType: app.couponType as "FULL" | "HALF",
    quantity: app.quantity,
    totalAmount: app.totalAmount,
    status: app.status as "PENDING" | "PROCESSED",
    appliedAt: app.appliedAt.toISOString(),
    validUntil: app.validUntil?.toISOString() ?? null,
  }));

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">1회 쿠폰 신청</h1>
      <CouponApplyForm
        initialApplications={serialized}
        unitPriceFull={unitPriceFull}
        unitPriceHalf={unitPriceHalf}
      />
    </div>
  );
}
