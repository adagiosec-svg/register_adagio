-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'DORMANT', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('REGULAR', 'ASSOCIATE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('FULL', 'HALF', 'SPECIAL');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('CONFIRMED', 'WAITLIST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'UNPAID');

-- CreateEnum
CREATE TYPE "FinalStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'PAYMENT_FAILED');

-- CreateEnum
CREATE TYPE "NoticeImportance" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('PENDING', 'PROCESSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneEncrypted" TEXT NOT NULL,
    "phoneLast4" TEXT NOT NULL,
    "portalIdHash" TEXT,
    "portalIdEncrypted" TEXT,
    "mateId" TEXT,
    "grade" "Grade",
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instructor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "themeColor" TEXT NOT NULL,
    "subsidyAmount" INTEGER NOT NULL DEFAULT 0,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountHolder" TEXT,
    "memo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Instructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorCourseHistory" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "courseId" TEXT,
    "courseName" TEXT NOT NULL,
    "courseType" "CourseType" NOT NULL,
    "daysCount" INTEGER,
    "durationHours" DECIMAL(65,30),
    "tuitionFee" INTEGER NOT NULL,
    "instructorFee" INTEGER NOT NULL,
    "accountInfo" TEXT,
    "sessionDate" TIMESTAMP(3),
    "yearMonth" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstructorCourseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructorId" TEXT,
    "instructorNameText" TEXT,
    "courseType" "CourseType" NOT NULL,
    "level" TEXT,
    "schedule" TEXT NOT NULL,
    "daysCount" INTEGER,
    "durationHours" DECIMAL(65,30),
    "hourlyRate" INTEGER,
    "capacity" INTEGER NOT NULL,
    "tuitionFee" INTEGER NOT NULL,
    "tuitionFeeIsManual" BOOLEAN NOT NULL DEFAULT false,
    "instructorFee" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationPeriod" (
    "id" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "openAt" TIMESTAMP(3) NOT NULL,
    "closeAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "waitlistOrder" INTEGER,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "clubFeePaymentStatus" "PaymentStatus",
    "paymentUpdatedAt" TIMESTAMP(3),
    "paymentUpdatedById" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "courseType" "CourseType" NOT NULL,
    "gradeAtTime" "Grade" NOT NULL,
    "tuitionFee" INTEGER NOT NULL,
    "instructorFee" INTEGER NOT NULL,
    "clubFee" INTEGER,
    "tuitionPaymentStatus" "PaymentStatus" NOT NULL,
    "clubFeePaymentStatus" "PaymentStatus",
    "finalStatus" "FinalStatus" NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "EnrollmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentHistoryArchive" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "courseType" "CourseType" NOT NULL,
    "gradeAtTime" "Grade" NOT NULL,
    "tuitionFee" INTEGER NOT NULL,
    "instructorFee" INTEGER NOT NULL,
    "clubFee" INTEGER,
    "tuitionPaymentStatus" "PaymentStatus" NOT NULL,
    "clubFeePaymentStatus" "PaymentStatus",
    "finalStatus" "FinalStatus" NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentHistoryArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SystemConfigLog" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemConfigLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "importance" "NoticeImportance" NOT NULL DEFAULT 'NORMAL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponPeriod" (
    "id" TEXT NOT NULL,
    "openAt" TIMESTAMP(3) NOT NULL,
    "closeAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "couponType" "CourseType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'PENDING',
    "validUntil" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponUsage" (
    "id" TEXT NOT NULL,
    "couponApplicationId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialCourse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructorId" TEXT,
    "instructorNameText" TEXT,
    "instructorContact" TEXT,
    "sessionAt" TIMESTAMP(3) NOT NULL,
    "durationHours" DECIMAL(65,30) NOT NULL,
    "level" TEXT,
    "hourlyRate" INTEGER NOT NULL,
    "tuitionFee" INTEGER NOT NULL,
    "instructorHourlyFee" INTEGER NOT NULL,
    "instructorFee" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialRegistration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialCourseId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "waitlistOrder" INTEGER,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentUpdatedAt" TIMESTAMP(3),
    "paymentUpdatedById" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "SpecialRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_portalIdHash_key" ON "User"("portalIdHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_mateId_key" ON "User"("mateId");

-- CreateIndex
CREATE INDEX "Course_yearMonth_idx" ON "Course"("yearMonth");

-- CreateIndex
CREATE INDEX "Course_yearMonth_courseType_idx" ON "Course"("yearMonth", "courseType");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationPeriod_yearMonth_key" ON "RegistrationPeriod"("yearMonth");

-- CreateIndex
CREATE INDEX "Registration_courseId_status_idx" ON "Registration"("courseId", "status");

-- CreateIndex
CREATE INDEX "Registration_courseId_waitlistOrder_idx" ON "Registration"("courseId", "waitlistOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_userId_courseId_key" ON "Registration"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentHistory_registrationId_key" ON "EnrollmentHistory"("registrationId");

-- CreateIndex
CREATE INDEX "EnrollmentHistory_userId_confirmedAt_idx" ON "EnrollmentHistory"("userId", "confirmedAt");

-- CreateIndex
CREATE INDEX "EnrollmentHistory_userId_yearMonth_idx" ON "EnrollmentHistory"("userId", "yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentHistoryArchive_originalId_key" ON "EnrollmentHistoryArchive"("originalId");

-- CreateIndex
CREATE INDEX "EnrollmentHistoryArchive_userId_idx" ON "EnrollmentHistoryArchive"("userId");

-- CreateIndex
CREATE INDEX "EnrollmentHistoryArchive_userId_yearMonth_idx" ON "EnrollmentHistoryArchive"("userId", "yearMonth");

-- CreateIndex
CREATE INDEX "SystemConfigLog_key_idx" ON "SystemConfigLog"("key");

-- CreateIndex
CREATE INDEX "CouponApplication_userId_idx" ON "CouponApplication"("userId");

-- CreateIndex
CREATE INDEX "SpecialCourse_sessionAt_idx" ON "SpecialCourse"("sessionAt");

-- CreateIndex
CREATE INDEX "SpecialRegistration_specialCourseId_status_idx" ON "SpecialRegistration"("specialCourseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialRegistration_userId_specialCourseId_key" ON "SpecialRegistration"("userId", "specialCourseId");

-- CreateIndex
CREATE INDEX "LoginAttempt_username_attemptedAt_idx" ON "LoginAttempt"("username", "attemptedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorCourseHistory" ADD CONSTRAINT "InstructorCourseHistory_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentHistory" ADD CONSTRAINT "EnrollmentHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentHistory" ADD CONSTRAINT "EnrollmentHistory_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentHistory" ADD CONSTRAINT "EnrollmentHistory_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponApplication" ADD CONSTRAINT "CouponApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_couponApplicationId_fkey" FOREIGN KEY ("couponApplicationId") REFERENCES "CouponApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialCourse" ADD CONSTRAINT "SpecialCourse_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialRegistration" ADD CONSTRAINT "SpecialRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialRegistration" ADD CONSTRAINT "SpecialRegistration_specialCourseId_fkey" FOREIGN KEY ("specialCourseId") REFERENCES "SpecialCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
