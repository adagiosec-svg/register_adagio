import type { CourseType, RegistrationStatus, Grade } from "@prisma/client";

export interface InstructorSummary {
  id: string;
  name: string;
  themeColor: string;
}

export interface CourseWithStats {
  id: string;
  name: string;
  schedule: string;
  courseType: CourseType;
  level: string | null;
  capacity: number;
  tuitionFee: number;
  daysCount: number | null;
  durationHours: number | null;
  instructor: InstructorSummary | null;
  instructorNameText: string | null;
  confirmedCount: number;
  waitlistCount: number;
  myRegistration: {
    id: string;
    status: RegistrationStatus;
    waitlistOrder: number | null;
    myRank: number | null; // confirmed 목록 내 순서 (1-based)
  } | null;
}

export interface RegistrationPeriodInfo {
  id: string;
  yearMonth: string;
  openAt: string; // ISO string
  closeAt: string;
  isActive: boolean;
  /** 현재 기간 상태 */
  state: "before" | "open" | "closed";
}

export interface RegistrationResult {
  id: string;
  status: RegistrationStatus;
  waitlistOrder: number | null;
  myRank: number | null;
  registeredAt: string;
  confirmedAt: string | null;
  course: {
    id: string;
    name: string;
    courseType: CourseType;
    level: string | null;
    schedule: string;
    daysCount: number | null;
    tuitionFee: number;
    instructor: { name: string; themeColor: string | null } | null;
    instructorNameText: string | null;
  };
  confirmedList: Array<{
    rank: number;
    name: string;
    registeredAt: string;
    isMe: boolean;
  }>;
  waitlistList: Array<{
    order: number;
    name: string;
    registeredAt: string;
    isMe: boolean;
  }>;
}

export interface SystemConfigMap {
  tuition_full_1: string;
  tuition_full_3: string;
  tuition_full_4: string;
  tuition_half_1: string;
  tuition_half_3: string;
  tuition_half_4: string;
  club_fee: string;
  tuition_account_bank: string;
  tuition_account_number: string;
  tuition_account_holder: string;
  club_account_bank: string;
  club_account_number: string;
  club_account_holder: string;
  [key: string]: string;
}
