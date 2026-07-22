import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decryptSensitiveOptional } from "@/lib/crypto";
import { InstructorsPanel } from "@/components/admin/instructors-panel";

export const dynamic = "force-dynamic";

export default async function InstructorsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const instructors = await prisma.instructor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });

  const data = instructors.map((i) => ({
    id: i.id,
    name: i.name,
    phone: decryptSensitiveOptional(i.phone),
    themeColor: i.themeColor,
    subsidyAmount: i.subsidyAmount,
    bankName: decryptSensitiveOptional(i.bankName),
    accountNumber: decryptSensitiveOptional(i.accountNumber),
    accountHolder: decryptSensitiveOptional(i.accountHolder),
    memo: i.memo,
    courseCount: i._count.courses,
  }));

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">강사 관리</h1>
      <InstructorsPanel initialInstructors={data} />
    </div>
  );
}
