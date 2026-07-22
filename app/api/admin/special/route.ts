import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const courses = await prisma.specialCourse.findMany({
    where: { isActive: true },
    include: {
      instructor: { select: { id: true, name: true, themeColor: true } },
      _count: {
        select: {
          registrations: { where: { status: "CONFIRMED" } },
        },
      },
    },
    orderBy: { sessionAt: "desc" },
  });

  return NextResponse.json(
    courses.map((c) => ({
      id: c.id,
      name: c.name,
      instructor: c.instructor,
      instructorNameText: c.instructorNameText,
      instructorContact: c.instructorContact,
      sessionAt: c.sessionAt.toISOString(),
      durationHours: Number(c.durationHours),
      level: c.level,
      hourlyRate: c.hourlyRate,
      tuitionFee: c.tuitionFee,
      instructorHourlyFee: c.instructorHourlyFee,
      instructorFee: c.instructorFee,
      capacity: c.capacity,
      description: c.description,
      confirmedCount: c._count.registrations,
      createdAt: c.createdAt.toISOString(),
    }))
  );
}

const schema = z.object({
  name: z.string().min(1),
  instructorId: z.string().nullable().optional(),
  instructorNameText: z.string().nullable().optional(),
  instructorContact: z.string().nullable().optional(),
  sessionAt: z.string().datetime(),
  durationHours: z.number().positive(),
  level: z.string().nullable().optional(),
  hourlyRate: z.number().int().nonnegative(),
  instructorHourlyFee: z.number().int().nonnegative(),
  capacity: z.number().int().positive(),
  description: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청", detail: parsed.error.issues }, { status: 400 });
  }

  const d = parsed.data;
  const tuitionFee = Math.round(d.hourlyRate * d.durationHours);
  const instructorFee = Math.round(d.instructorHourlyFee * d.durationHours);

  const course = await prisma.specialCourse.create({
    data: {
      name: d.name,
      instructorId: d.instructorId ?? null,
      instructorNameText: d.instructorNameText ?? null,
      instructorContact: d.instructorContact ?? null,
      sessionAt: new Date(d.sessionAt),
      durationHours: d.durationHours,
      level: d.level ?? null,
      hourlyRate: d.hourlyRate,
      tuitionFee,
      instructorHourlyFee: d.instructorHourlyFee,
      instructorFee,
      capacity: d.capacity,
      description: d.description ?? null,
    },
  });

  return NextResponse.json(course, { status: 201 });
}
