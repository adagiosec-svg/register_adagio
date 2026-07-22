import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getAllConfig } from "@/lib/system-config";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  instructorId: z.string().nullable().optional(),
  instructorNameText: z.string().nullable().optional(),
  level: z.string().nullable().optional(),
  schedule: z.string().optional(),
  daysCount: z.number().int().positive().nullable().optional(),
  capacity: z.number().int().positive().optional(),
  tuitionFeeIsManual: z.boolean().optional(),
  tuitionFeeOverride: z.number().int().nonnegative().optional(),
  description: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const d = parsed.data;

  const current = await prisma.course.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "수업을 찾을 수 없습니다." }, { status: 404 });

  let tuitionFee: number | undefined;
  let instructorFee: number | undefined;

  const needsRecalc =
    d.daysCount !== undefined || d.tuitionFeeIsManual !== undefined || d.tuitionFeeOverride !== undefined;

  if (needsRecalc && current.courseType !== "SPECIAL") {
    const config = await getAllConfig();
    const irateFull = Number(config.instructor_fee_rate_full ?? 0);
    const irateHalf = Number(config.instructor_fee_rate_half ?? 0);

    const days = d.daysCount ?? current.daysCount ?? 1;
    const isManual = d.tuitionFeeIsManual ?? current.tuitionFeeIsManual;
    const override = d.tuitionFeeOverride;
    const tuitionKey = `tuition_${current.courseType.toLowerCase()}_${days}`;
    const autoTuition = Number(config[tuitionKey] ?? 0);
    const irate = current.courseType === "FULL" ? irateFull : irateHalf;

    tuitionFee = isManual && override != null ? override : autoTuition;
    instructorFee = irate * days;
  }

  const updated = await prisma.course.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.instructorId !== undefined ? { instructorId: d.instructorId } : {}),
      ...(d.instructorNameText !== undefined ? { instructorNameText: d.instructorNameText } : {}),
      ...(d.level !== undefined ? { level: d.level } : {}),
      ...(d.schedule !== undefined ? { schedule: d.schedule } : {}),
      ...(d.daysCount !== undefined ? { daysCount: d.daysCount } : {}),
      ...(d.capacity !== undefined ? { capacity: d.capacity } : {}),
      ...(d.tuitionFeeIsManual !== undefined ? { tuitionFeeIsManual: d.tuitionFeeIsManual } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(tuitionFee !== undefined ? { tuitionFee } : {}),
      ...(instructorFee !== undefined ? { instructorFee } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const regCount = await prisma.registration.count({
    where: { courseId: id, status: { in: ["CONFIRMED", "WAITLIST"] } },
  });
  if (regCount > 0) {
    return NextResponse.json(
      { error: "수강신청 인원이 있는 수업은 삭제할 수 없습니다." },
      { status: 409 }
    );
  }

  await prisma.course.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
