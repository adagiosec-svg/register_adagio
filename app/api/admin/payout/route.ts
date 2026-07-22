import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { decryptSensitiveOptional } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const yearMonth =
    searchParams.get("yearMonth") ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const courses = await prisma.course.findMany({
    where: { yearMonth, isActive: true, instructorId: { not: null } },
    include: {
      instructor: true,
      _count: { select: { registrations: { where: { status: "CONFIRMED" } } } },
    },
    orderBy: { schedule: "asc" },
  });

  const instructorMap = new Map<
    string,
    {
      instructor: typeof courses[0]["instructor"];
      courses: Array<{
        id: string;
        name: string;
        courseType: string;
        schedule: string;
        confirmedCount: number;
        instructorFee: number;
      }>;
      totalFee: number;
      subsidy: number;
      total: number;
    }
  >();

  for (const course of courses) {
    if (!course.instructor) continue;
    const key = course.instructor.id;
    if (!instructorMap.has(key)) {
      instructorMap.set(key, {
        instructor: course.instructor,
        courses: [],
        totalFee: 0,
        subsidy: course.instructor.subsidyAmount,
        total: 0,
      });
    }
    const entry = instructorMap.get(key)!;
    const confirmedCount = course._count.registrations;
    entry.courses.push({
      id: course.id,
      name: course.name,
      courseType: course.courseType,
      schedule: course.schedule,
      confirmedCount,
      instructorFee: course.instructorFee,
    });
    if (confirmedCount > 0) {
      entry.totalFee += course.instructorFee;
    }
  }

  const result = Array.from(instructorMap.values()).map((entry) => {
    const hasCourse = entry.courses.some((c) => c.confirmedCount > 0);
    const subsidy = hasCourse ? entry.subsidy : 0;
    return {
      ...entry,
      subsidy,
      total: entry.totalFee + subsidy,
      instructor: {
        id: entry.instructor!.id,
        name: entry.instructor!.name,
        themeColor: entry.instructor!.themeColor,
        subsidyAmount: entry.instructor!.subsidyAmount,
        bankName: decryptSensitiveOptional(entry.instructor!.bankName),
        accountNumber: decryptSensitiveOptional(entry.instructor!.accountNumber),
        accountHolder: decryptSensitiveOptional(entry.instructor!.accountHolder),
      },
    };
  });

  return NextResponse.json({ yearMonth, instructors: result });
}
