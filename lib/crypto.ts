import { createHmac, createCipheriv, createDecipheriv, randomBytes } from "crypto";

// 키는 함수 호출 시점에 초기화 (env 미설정 환경에서 모듈 로드 실패 방지)
function resolveKey(envVar: string): Buffer {
  const val = process.env[envVar];
  if (!val) throw new Error(`환경변수 ${envVar}가 설정되지 않았습니다.`);
  return Buffer.from(val, "hex");
}

let _portalKey: Buffer | null = null;
let _phoneKey: Buffer | null = null;
let _sensitiveKey: Buffer | null = null;

function getPortalKey(): Buffer { return (_portalKey ??= resolveKey("PORTAL_ID_AES_KEY")); }
function getPhoneKey(): Buffer { return (_phoneKey ??= resolveKey("PHONE_AES_KEY")); }
function getSensitiveKey(): Buffer { return (_sensitiveKey ??= resolveKey("SENSITIVE_AES_KEY")); }

// ─── 포탈 ID (PORTAL_ID_AES_KEY) ───

/** 포탈 ID → HMAC-SHA256 해시 (중복 가입 방지·조회용) */
export function hashPortalId(portalId: string): string {
  const pepper = process.env.PORTAL_ID_PEPPER;
  if (!pepper) throw new Error("환경변수 PORTAL_ID_PEPPER가 설정되지 않았습니다.");
  return createHmac("sha256", pepper).update(portalId).digest("hex");
}

/** 포탈 ID AES-256-GCM 암호화 — PORTAL_ID_AES_KEY 사용 */
export function encryptPortalId(portalId: string): string {
  const key = getPortalKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(portalId, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptPortalId(ciphertext: string): string {
  const key = getPortalKey();
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return decipher.update(Buffer.from(encryptedHex, "hex")).toString("utf8") + decipher.final("utf8");
}

// ─── 전화번호 (PHONE_AES_KEY) ───

/** 전화번호 AES-256-GCM 암호화 — PHONE_AES_KEY 사용 */
export function encryptPhone(phone: string): string {
  const key = getPhoneKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(phone, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptPhone(ciphertext: string): string {
  const key = getPhoneKey();
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return decipher.update(Buffer.from(encryptedHex, "hex")).toString("utf8") + decipher.final("utf8");
}

/** 전화번호 뒤 4자리 추출 (화면 마스킹용) */
export function phoneLastFour(phone: string): string {
  return phone.replace(/\D/g, "").slice(-4);
}

// ─── 기타 민감정보 (SENSITIVE_AES_KEY) — 강사 계좌·연락처, 시스템 설정 계좌번호 ───

/** 민감정보 AES-256-GCM 암호화 — SENSITIVE_AES_KEY 사용 */
export function encryptSensitive(value: string): string {
  const key = getSensitiveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSensitive(ciphertext: string): string {
  const key = getSensitiveKey();
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return decipher.update(Buffer.from(encryptedHex, "hex")).toString("utf8") + decipher.final("utf8");
}

/**
 * 암호문이면 복호화, 평문(레거시)이면 그대로 반환.
 * AES-GCM IV는 12바이트 = 24 hex chars — 이를 식별 기준으로 사용.
 */
export function decryptSensitiveOptional(value: string | null | undefined): string | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length === 3 && /^[0-9a-f]{24}$/i.test(parts[0])) {
    try {
      return decryptSensitive(value);
    } catch {
      return value; // 복호화 실패 → 평문으로 간주 (레거시)
    }
  }
  return value; // 평문 (레거시)
}
