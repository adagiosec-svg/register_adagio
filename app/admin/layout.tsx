import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/nav/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="min-h-screen bg-surface-0">
      <AdminNav name={session.user.name ?? session.user.username} />
      <main className="max-w-[960px] mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
