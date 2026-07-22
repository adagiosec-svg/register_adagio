import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prismaDirect } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  await prismaDirect.$transaction(async (tx) => {
    const reg = await tx.registration.findUnique({
      where: { id },
      select: { courseId: true, status: true },
    });
    if (!reg || reg.status === "CANCELLED") return;

    await tx.registration.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    // 확정 취소 시 대기자 승격
    if (reg.status === "CONFIRMED") {
      const next = await tx.registration.findFirst({
        where: { courseId: reg.courseId, status: "WAITLIST" },
        orderBy: { waitlistOrder: "asc" },
      });
      if (next) {
        await tx.registration.update({
          where: { id: next.id },
          data: { status: "CONFIRMED", confirmedAt: new Date(), waitlistOrder: null },
        });
        // 나머지 대기 순번 -1 조정
        await tx.registration.updateMany({
          where: {
            courseId: reg.courseId,
            status: "WAITLIST",
            waitlistOrder: { gt: next.waitlistOrder ?? 0 },
          },
          data: { waitlistOrder: { decrement: 1 } },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
