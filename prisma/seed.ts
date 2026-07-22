import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encryptPhone, phoneLastFour } from "../lib/crypto";

const prisma = new PrismaClient();

async function main() {
  // 시스템 설정 초기값
  const configs = [
    { key: "tuition_full_1",          value: "15000" },
    { key: "tuition_full_3",          value: "40000" },
    { key: "tuition_full_4",          value: "50000" },
    { key: "tuition_half_1",          value: "10000" },
    { key: "tuition_half_3",          value: "28000" },
    { key: "tuition_half_4",          value: "36000" },
    { key: "instructor_fee_rate_full", value: "35000" },
    { key: "instructor_fee_rate_half", value: "25000" },
    { key: "club_fee",                 value: "10000" },
    { key: "course_levels",            value: "입문,Lev 0.5,Lev 1,Lev 1.5,Lev 2,Lev 2+,Special,파드되,포인트" },
    { key: "tuition_account_bank",     value: "국민은행" },
    { key: "tuition_account_number",   value: "123-456-789012" },
    { key: "tuition_account_holder",   value: "홍길동" },
    { key: "club_account_bank",        value: "신한은행" },
    { key: "club_account_number",      value: "987-654-321098" },
    { key: "club_account_holder",      value: "홍길동" },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  // 강사 테마컬러 팔레트 (12색+)
  const colorPalette = [
    "#ec4899", "#f59e0b", "#3b82f6", "#84cc16", "#a855f7",
    "#f43f5e", "#f7c932", "#06b6d4", "#14b8a6", "#6366f1",
    "#ff00aa", "#f5f122", 
  ];

  const instructors: { name: string; phone: string; themeColor: string }[] = [];
  //   { name: "김땡땡", phone: "010-0000-5678", themeColor: colorPalette[0] },
  // ];

  for (const inst of instructors) {
    await prisma.instructor.upsert({
      where: { id: inst.name },
      update: {},
      create: inst,
    });
  }

  // 관리자 계정
  const adminPhone = "010-0000-0000";
  const adminPasswordHash = await bcrypt.hash("adagio11", 12);
  await prisma.user.upsert({
    where: { username: "adagio_admin" },
    update: {
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: adminPasswordHash,
    },
    create: {
      username: "adagio_admin",
      passwordHash: adminPasswordHash,
      name: "관리자",
      phoneEncrypted: encryptPhone(adminPhone),
      phoneLast4: phoneLastFour(adminPhone),
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Seed 완료");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
