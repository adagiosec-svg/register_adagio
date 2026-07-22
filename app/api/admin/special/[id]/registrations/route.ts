import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const registrations = await prisma.specialRegistration.findMany({
    where: { specialCourseId: id },
    include: {
      user: { select: { username: true, name: true, grade: true } },
    },
    orderBy: [{ status: "asc" }, { waitlistOrder: "asc" }, { registeredAt: "asc" }],
  });

  return NextResponse.json(
    registrations.map((r) => ({
      id: r.id,
      userId: r.userId,
      username: r.user.username,
      name: r.user.name,
      grade: r.user.grade,
      status: r.status,
      waitlistOrder: r.waitlistOrder,
      paymentStatus: r.paymentStatus,
      registeredAt: r.registeredAt.toISOString(),
      confirmedAt: r.confirmedAt?.toISOString() ?? null,
    }))
  );
}

const patchSchema = z.object({
  registrationId: z.string(),
  paymentStatus: z.enum(["PENDING", "PAID", "UNPAID"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const reg = await prisma.specialRegistration.findFirst({
    where: { id: parsed.data.registrationId, specialCourseId: id },
  });
  if (!reg) return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });

  await prisma.specialRegistration.update({
    where: { id: parsed.data.registrationId },
    data: {
      paymentStatus: parsed.data.paymentStatus,
      paymentUpdatedAt: new Date(),
      paymentUpdatedById: session!.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
