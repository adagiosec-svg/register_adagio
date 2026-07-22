import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const notices = await prisma.notice.findMany({
    orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(notices.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  })));
}

const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  importance: z.enum(["NORMAL", "IMPORTANT", "URGENT"]).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const d = parsed.data;
  const notice = await prisma.notice.create({
    data: {
      title: d.title,
      content: d.content,
      importance: d.importance ?? "NORMAL",
      sortOrder: d.sortOrder ?? 0,
      isActive: d.isActive ?? true,
      createdById: session!.user.id,
    },
  });

  return NextResponse.json({ ...notice, createdAt: notice.createdAt.toISOString(), updatedAt: notice.updatedAt.toISOString() }, { status: 201 });
}
