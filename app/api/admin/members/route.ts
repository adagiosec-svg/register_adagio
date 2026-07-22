import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { decryptPortalId } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // PENDING | ACTIVE | DORMANT | REJECTED | SUSPENDED | null (=all)
  const search = searchParams.get("search") ?? "";

  const users = await prisma.user.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
              { phoneLast4: { contains: search } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      username: true,
      name: true,
      phoneLast4: true,
      grade: true,
      status: true,
      role: true,
      mateId: true,
      portalIdEncrypted: true,
      createdAt: true,
      approvedAt: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  const result = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    approvedAt: u.approvedAt?.toISOString() ?? null,
    portalId: u.portalIdEncrypted ? decryptPortalId(u.portalIdEncrypted) : null,
    portalIdEncrypted: undefined, // 응답에서 암호문 제거
  }));

  return NextResponse.json(result);
}
