"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export type ActionState = { error: string } | null;

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/courses",
    });
  } catch (error) {
    // next-auth redirect는 NEXT_REDIRECT 내부 오류를 throw하므로 re-throw 필요
    if (error instanceof AuthError) {
      return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
    }
    throw error;
  }
  return null;
}
