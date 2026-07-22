# 아다지오 수강신청 시스템

**아다지오**의 월별 수강신청·입금 관리 웹 애플리케이션.

---

## 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | Next.js 15 (App Router, React 19) |
| 데이터베이스 | Neon Serverless PostgreSQL |
| ORM | Prisma 6 |
| 인증 | NextAuth v5 (beta) — credentials 기반 자체 로그인 |
| 실시간 | Pusher (수강신청 인원 실시간 브로드캐스트) |
| 이메일 | Resend (회원 승인/거절/입금 미완료 알림) |
| 스타일 | Tailwind CSS v3 |
| 배포 | Vercel (Edge Functions + Cron Jobs) |
| 암호화 | AES-256-GCM (Node.js `crypto`) |
| 유효성 검사 | Zod |

---

## 환경 변수

```env
# Database (Neon)
DATABASE_URL=          # PgBouncer pooled URL (일반 쿼리용)
DIRECT_URL=            # 직접 연결 URL (마이그레이션·트랜잭션용)

# NextAuth
AUTH_SECRET=           # 세션 서명 키

# Pusher
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=

# Resend
RESEND_API_KEY=

# 암호화 키 (32바이트 hex = 64자)
PORTAL_ID_AES_KEY=     # 포탈 ID 암호화
PORTAL_ID_PEPPER=      # 포탈 ID HMAC pepper (중복 가입 방지)
PHONE_AES_KEY=         # 전화번호 암호화
SENSITIVE_AES_KEY=     # 강사 계좌·연락처 등 기타 민감정보 암호화

# Vercel Cron 인증
CRON_SECRET=
```

---

## 디렉터리 구조

```
adagio/
├── app/
│   ├── (auth)/                 # 로그인·회원가입·승인 대기 (공개)
│   │   ├── login/
│   │   ├── register/
│   │   └── pending/
│   ├── (user)/                 # 일반 회원 페이지 (인증 필요)
│   │   ├── courses/            # 수강신청 시간표
│   │   ├── result/             # 신청 결과 확인
│   │   ├── mypage/             # 내 수강 내역
│   │   ├── special/            # 특강 신청
│   │   ├── coupons/            # 쿠폰 신청
│   │   └── notices/            # 공지사항
│   ├── admin/                  # 관리자 페이지 (ADMIN 역할 필요)
│   │   ├── dashboard/          # 월별 현황 요약
│   │   ├── courses/            # 수업 등록·수정·삭제
│   │   ├── instructors/        # 강사 관리
│   │   ├── members/            # 회원 승인·관리
│   │   ├── coupons/            # 쿠폰 신청 처리
│   │   ├── notices/            # 공지사항 관리
│   │   ├── payout/             # 강사 지급 내역
│   │   └── settings/           # 시스템 설정 (계좌·수강료 등)
│   ├── api/
│   │   ├── auth/register/      # 회원가입 API
│   │   ├── registrations/      # 수강신청 CRUD + 기간 조회 + 결과 조회
│   │   ├── courses/            # 수업 목록 조회
│   │   ├── special/            # 특강 목록·신청
│   │   ├── coupons/            # 쿠폰 기간 조회·신청
│   │   ├── notices/            # 공지사항 조회
│   │   ├── admin/              # 관리자 전용 API (회원·수업·강사·설정·지급 등)
│   │   └── cron/payment-failed # Vercel Cron — 입금 마감 처리
│   └── actions/auth.ts         # Server Action (로그인)
├── components/
│   ├── admin/                  # 관리자 UI 컴포넌트
│   │   ├── enrollment-table    # 수강신청 현황 (수업별/회원별 탭)
│   │   ├── courses-panel       # 수업 목록·CRUD
│   │   ├── instructors-panel   # 강사 목록·CRUD
│   │   ├── members-table       # 회원 목록·승인
│   │   ├── coupons-panel       # 쿠폰 신청 목록
│   │   ├── notices-panel       # 공지사항 관리
│   │   ├── payout-panel        # 강사 지급 계산
│   │   ├── special-courses-panel # 특강 관리
│   │   ├── settings-form       # 시스템 설정
│   │   └── registration-period-form # 수강신청 기간 설정
│   ├── timetable/
│   │   ├── timetable-grid      # 20분 단위 CSS Grid 시간표 (Pusher 실시간)
│   │   ├── course-card         # 수업 카드 (선택·상태 표시)
│   │   └── course-detail-modal # 수업 상세·신청·취소 모달
│   ├── registration/
│   │   ├── result-view         # 신청 결과 + 납부 안내
│   │   └── payment-info        # 계좌 정보 표시
│   ├── mypage/history-tabs     # 수강 내역 (정규·특강·히스토리 탭)
│   ├── special/special-course-list # 특강 목록·신청
│   ├── coupon/coupon-apply-form    # 쿠폰 신청 폼
│   ├── notices/notice-list     # 공지사항 목록
│   ├── nav/                    # 사용자·관리자 내비게이션
│   └── ui/course-list-card     # 공통 수업 카드 컴포넌트
├── lib/
│   ├── auth.ts                 # NextAuth 설정
│   ├── admin-auth.ts           # 관리자 권한 검증 헬퍼
│   ├── prisma.ts               # Prisma 클라이언트 (pooled + direct)
│   ├── crypto.ts               # AES-256-GCM 암호화/복호화
│   ├── pusher.ts               # Pusher 서버 클라이언트
│   ├── email.ts                # Resend 이메일 발송
│   ├── rate-limit.ts           # 로그인 시도 제한
│   ├── system-config.ts        # SystemConfig 조회 헬퍼
│   └── timetable.ts            # 시간표 그리드 빌드·레벨 색상
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── types/api.ts                # 공유 TypeScript 타입
├── middleware.ts               # 라우트 보호 (NextAuth)
└── vercel.json                 # Cron Job 설정
```

---

## 데이터 모델 요약

| 모델 | 설명 |
|---|---|
| `User` | 회원 (상태: PENDING→ACTIVE/REJECTED, 등급: REGULAR/ASSOCIATE) |
| `Instructor` | 강사 (themeColor, 계좌 암호화, 지원금) |
| `Course` | 수업 (FULL 80분 / HALF 40분 / SPECIAL 비정기) |
| `RegistrationPeriod` | 월별 수강신청 기간 |
| `Registration` | 수강신청 (CONFIRMED / WAITLIST / CANCELLED, 입금 상태) |
| `EnrollmentHistory` | 수강 이력 스냅샷 (2년 보관) |
| `EnrollmentHistoryArchive` | 2년 초과 이력 아카이브 |
| `InstructorCourseHistory` | 강사 수업 이력 (5년 보관) |
| `SpecialCourse` | 특강 (별도 신청 흐름) |
| `SpecialRegistration` | 특강 신청 |
| `CouponPeriod` | 쿠폰 신청 가능 기간 |
| `CouponApplication` | 쿠폰 신청 (PENDING → PROCESSED) |
| `Notice` | 공지사항 |
| `SystemConfig` | key-value 시스템 설정 (계좌번호·수강료 등) |
| `LoginAttempt` | 로그인 시도 기록 (rate limit) |

---

## 보안 설계

- **포탈 ID**: `HMAC-SHA256` 해시로 중복 가입 방지, `AES-256-GCM`으로 별도 암호화 저장 (`PORTAL_ID_AES_KEY`)
- **전화번호**: `AES-256-GCM` 암호화 (`PHONE_AES_KEY`), 화면 표시는 뒤 4자리만
- **강사 계좌·연락처 등**: `AES-256-GCM` 암호화 (`SENSITIVE_AES_KEY`)
- **비밀번호**: `bcryptjs` 해시
- **동시 수강신청**: Neon Serializable 트랜잭션 + `SELECT FOR UPDATE`로 선착순 정확성 보장
- **로그인 rate limit**: `LoginAttempt` 테이블 기반 5분 윈도우 제한

---

## 구현 완료

### 인증·회원
- [x] 회원가입 (포탈 ID·전화번호 암호화 저장)
- [x] 로그인 / 로그아웃 (NextAuth credentials)
- [x] 승인 대기 상태 안내 페이지
- [x] 관리자 회원 승인·거절 (이메일 알림 발송)
- [x] 회원 상태 관리 (ACTIVE / DORMANT / SUSPENDED)
- [x] 로그인 시도 제한 (rate limiting)

### 수업·강사 관리 (관리자)
- [x] 수업 등록·수정·삭제 (FULL / HALF / SPECIAL)
- [x] 강사 등록·수정 (themeColor 자동 배정, 계좌 암호화)
- [x] 수업별 수강료·강사료 자동 계산
- [x] 강사 지원금(월 고정 지급) 설정

### 수강신청 (회원)
- [x] 20분 단위 CSS Grid 시간표 (수업 길이만큼 span)
- [x] 수업 카드: 강사명·themeColor 점·인원바·시작~종료 시간 표시
- [x] 여러 수업 선택 후 일괄 신청
- [x] 선착순 확정 / 초과 시 후보 자동 등록
- [x] Pusher 실시간 인원 현황 브로드캐스트
- [x] 취소 후 재신청 처리 (upsert, unique constraint 안전)
- [x] 수강신청 기간 외 수업 정보 모달

### 신청 결과·마이페이지 (회원)
- [x] 신청 결과 페이지 (확정·후보 목록 + 납부 계좌 안내)
- [x] 마이페이지: 이번 달 확정·후보 수업, 수강 히스토리, 특강 내역

### 수강 현황 관리 (관리자)
- [x] 수업별 / 회원별 탭 전환
- [x] 수업별: 확정·후보 명단, 수강료·동호회비 입금 상태 개별 변경
- [x] 회원별: 전체 입금 일괄 완료, 입금 미완료 상태 강조 표시
- [x] 관리자 수강 취소

### 입금 관리
- [x] 입금 상태: PENDING(대기) / PAID(완료) / UNPAID(미완료)
- [x] 준회원 동호회비 별도 입금 상태 관리
- [x] 관리자 일괄 입금 완료 처리 (bulk-payment API)
- [x] Vercel Cron: 수강신청 마감 후 PENDING → UNPAID 자동 전환 (매일 01:00)
- [x] 입금 미완료 이메일 알림 (Resend)

### 특강 (관리자·회원)
- [x] 특강 등록·수정·삭제 (관리자)
- [x] 특강 목록 조회·신청 (회원)
- [x] 특강 수강신청 현황 관리 (관리자)

### 쿠폰
- [x] 쿠폰 신청 기간 설정 (관리자)
- [x] 쿠폰 신청 (회원, FULL/HALF/SPECIAL 수량 선택)
- [x] 쿠폰 신청 목록 조회·처리 (관리자)

### 공지사항
- [x] 공지사항 등록·수정·삭제 (관리자)
- [x] 공지사항 목록 조회 (회원, 중요도별 정렬)

### 강사 지급
- [x] 월별 강사료·지원금 합산 계산
- [x] 강사 계좌 정보 복호화 표시 (관리자)

### 시스템 설정
- [x] 수강료 납부 계좌, 동호회비 계좌 관리
- [x] 동호회비 금액 설정
- [x] 설정 변경 이력 로깅 (`SystemConfigLog`)

---

## 미구현 / 개선 여지

### 기능
- [ ] **후보 자동 승격**: 확정자 취소 시 1번 후보를 자동으로 CONFIRMED 전환 + 이메일 알림 (`sendWaitlistPromotedNotice` 함수는 작성됨, 연결 미완)
- [ ] **EnrollmentHistory 아카이브 Cron**: 2년 초과 이력을 `EnrollmentHistoryArchive`로 이동하는 자동화 작업 미구현 (모델·`archivedAt` 필드만 존재)
- [ ] **InstructorCourseHistory 기록**: 월 마감 시 강사 수업 이력 스냅샷 저장 로직 미구현 (모델만 존재)
- [ ] **CouponUsage 사용 처리**: 쿠폰 신청 처리(PROCESSED) 후 실제 사용 차감 흐름 미구현 (`CouponUsage` 모델만 존재)
- [ ] **강사 지급 확정 처리**: 지급 완료 상태 업데이트 (`/api/admin/payout/status` 라우트 파일 존재하나 미확인)
- [ ] **대시보드 통계**: 관리자 대시보드 상세 통계 (현재 API만 구현, UI 미완성 가능성)
- [ ] **회원 포탈 ID 수정**: 승인 후 포탈 ID 변경 불가 (암호화 설계상 수정 UI 미제공)

### 기술
- [ ] **이메일 도메인 설정**: 현재 `{username}@회사이메일` 하드코딩, 실제 이메일 필드 없음
- [ ] **테스트 코드**: 단위·통합 테스트 부재
- [ ] **EnrollmentHistory clubFee 기록**: cron에서 준회원 동호회비(`clubFee`) 스냅샷 저장 미구현

---

## 로컬 개발 환경 설정

```bash
npm install

# .env.local 파일 생성 후 환경 변수 입력

# DB 스키마 적용
npm run db:push

# 시드 데이터 (관리자 계정 등)
npm run db:seed

# 개발 서버 실행
npm run dev
```

## 배포

Vercel에 GitHub 저장소를 연결하여 자동 배포. `vercel.json`에 Cron Job(`/api/cron/payment-failed`) 설정 포함.
