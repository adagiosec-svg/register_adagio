import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["tuition", "clubFee"]),
  status: z.enum(["PENDING", "PAID", "UNPAID"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const { type, status } = parsed.data;

  await prisma.registration.update({
    where: { id },
    data: {
      ...(type === "tuition"
        ? { paymentStatus: status, paymentUpdatedAt: new Date(), paymentUpdatedById: session!.user.id }
        : { clubFeePaymentStatus: status, paymentUpdatedAt: new Date(), paymentUpdatedById: session!.user.id }),
    },
  });

  return NextResponse.json({ ok: true });
}
