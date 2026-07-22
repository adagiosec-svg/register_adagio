import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getAllConfig } from "@/lib/system-config";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const yearMonth =
    searchParams.get("yearMonth") ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const courses = await prisma.course.findMany({
    where: { yearMonth, isActive: true },
    include: {
      instructor: { select: { id: true, name: true, themeColor: true } },
      _count: { select: { registrations: { where: { status: "CONFIRMED" } } } },
    },
    orderBy: { schedule: "asc" },
  });

  return NextResponse.json(
    courses.map((c) => ({
      ...c,
      tuitionFee: c.tuitionFee,
      instructorFee: c.instructorFee,
      confirmedCount: c._count.registrations,
      createdAt: c.createdAt.toISOString(),
      durationHours: c.durationHours ? Number(c.durationHours) : null,
      _count: undefined,
    }))
  );
}

const courseSchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  name: z.string().min(1),
  instructorId: z.string().nullable().optional(),
  instructorNameText: z.string().nullable().optional(),
  courseType: z.enum(["FULL", "HALF", "SPECIAL"]),
  level: z.string().nullable().optional(),
  schedule: z.string().min(1),
  daysCount: z.number().int().positive().nullable().optional(),
  capacity: z.number().int().positive(),
  tuitionFeeIsManual: z.boolean().optional(),
  tuitionFeeOverride: z.number().int().nonnegative().optional(),
  description: z.string().nullable().optional(),
  // Special 전용
  durationHours: z.number().positive().nullable().optional(),
  hourlyRate: z.number().int().nonnegative().nullable().optional(),
  instructorHourlyFee: z.number().int().nonnegative().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = courseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청", detail: parsed.error.issues }, { status: 400 });
  }

  const d = parsed.data;
  const config = await getAllConfig();
  const instructorRateFull = Number(config.instructor_fee_rate_full ?? 0);
  const instructorRateHalf = Number(config.instructor_fee_rate_half ?? 0);

  let tuitionFee: number;
  let instructorFee: number;

  if (d.courseType === "SPECIAL") {
    const hrs = d.durationHours ?? 1;
    tuitionFee = d.tuitionFeeOverride ?? Math.round((d.hourlyRate ?? 0) * hrs);
    instructorFee = Math.round((d.instructorHourlyFee ?? 0) * hrs);
  } else {
    const days = d.daysCount ?? 1;
    const tuitionKey = `tuition_${d.courseType.toLowerCase()}_${days}`;
    const autoTuition = Number(config[tuitionKey] ?? 0);
    const irate = d.courseType === "FULL" ? instructorRateFull : instructorRateHalf;
    tuitionFee = d.tuitionFeeIsManual && d.tuitionFeeOverride != null ? d.tuitionFeeOverride : autoTuition;
    instructorFee = irate * days;
  }

  const course = await prisma.course.create({
    data: {
      yearMonth: d.yearMonth,
      name: d.name,
      instructorId: d.instructorId ?? null,
      instructorNameText: d.instructorNameText ?? null,
      courseType: d.courseType,
      level: d.level ?? null,
      schedule: d.schedule,
      daysCount: d.daysCount ?? null,
      capacity: d.capacity,
      tuitionFee,
      tuitionFeeIsManual: d.tuitionFeeIsManual ?? false,
      instructorFee,
      description: d.description ?? null,
      durationHours: d.durationHours ?? null,
      hourlyRate: d.hourlyRate ?? null,
    },
  });

  return NextResponse.json(course, { status: 201 });
}
