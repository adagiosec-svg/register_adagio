import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      grade: string | null;
      mateId: string | null;
      status: string;
    } & DefaultSession["user"];
  }
}
