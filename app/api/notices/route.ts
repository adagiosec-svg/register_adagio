import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notices = await prisma.notice.findMany({
    where: { isActive: true },
    orderBy: [{ importance: "desc" }, { sortOrder: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      content: true,
      importance: true,
      createdAt: true,
    },
  });

  return NextResponse.json(notices.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })));
}
