import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllConfig } from "@/lib/system-config";
import { z } from "zod";

const schema = z.object({
  couponType: z.enum(["FULL", "HALF"]),
  quantity: z.number().int().min(1).max(10),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applications = await prisma.couponApplication.findMany({
    where: { userId: session.user.id },
    include: { usages: true },
    orderBy: { appliedAt: "desc" },
  });

  return NextResponse.json(applications);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { couponType, quantity } = parsed.data;

  // 1회 단가 조회
  const config = await getAllConfig();
  const priceKey = couponType === "FULL" ? "tuition_full_1" : "tuition_half_1";
  const unitPrice = Number(config[priceKey] ?? 0);
  if (unitPrice === 0) {
    return NextResponse.json({ error: "수강료 설정이 없습니다. 관리자에게 문의하세요." }, { status: 500 });
  }
  const totalAmount = unitPrice * quantity;

  const application = await prisma.couponApplication.create({
    data: {
      userId: session.user.id,
      couponType,
      quantity,
      totalAmount,
      status: "PENDING",
    },
  });

  return NextResponse.json(application, { status: 201 });
}
