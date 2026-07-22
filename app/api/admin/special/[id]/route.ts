import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  instructorId: z.string().nullable().optional(),
  instructorNameText: z.string().nullable().optional(),
  instructorContact: z.string().nullable().optional(),
  sessionAt: z.string().datetime().optional(),
  durationHours: z.number().positive().optional(),
  level: z.string().nullable().optional(),
  hourlyRate: z.number().int().nonnegative().optional(),
  instructorHourlyFee: z.number().int().nonnegative().optional(),
  capacity: z.number().int().positive().optional(),
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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const d = parsed.data;
  const existing = await prisma.specialCourse.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "수업을 찾을 수 없습니다." }, { status: 404 });

  const durationHours = d.durationHours ?? Number(existing.durationHours);
  const hourlyRate = d.hourlyRate ?? existing.hourlyRate;
  const instructorHourlyFee = d.instructorHourlyFee ?? existing.instructorHourlyFee;
  const tuitionFee = Math.round(hourlyRate * durationHours);
  const instructorFee = Math.round(instructorHourlyFee * durationHours);

  const course = await prisma.specialCourse.update({
    where: { id },
    data: {
      ...(d.name ? { name: d.name } : {}),
      ...(d.instructorId !== undefined ? { instructorId: d.instructorId } : {}),
      ...(d.instructorNameText !== undefined ? { instructorNameText: d.instructorNameText } : {}),
      ...(d.instructorContact !== undefined ? { instructorContact: d.instructorContact } : {}),
      ...(d.sessionAt ? { sessionAt: new Date(d.sessionAt) } : {}),
      ...(d.level !== undefined ? { level: d.level } : {}),
      ...(d.capacity ? { capacity: d.capacity } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      durationHours,
      hourlyRate,
      instructorHourlyFee,
      tuitionFee,
      instructorFee,
    },
  });

  return NextResponse.json(course);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const regCount = await prisma.specialRegistration.count({
    where: { specialCourseId: id, status: "CONFIRMED" },
  });
  if (regCount > 0) {
    return NextResponse.json(
      { error: "확정 수강생이 있는 수업은 삭제할 수 없습니다." },
      { status: 409 }
    );
  }

  await prisma.specialCourse.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
