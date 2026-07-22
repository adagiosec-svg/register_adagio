import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllConfig } from "@/lib/system-config";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const config = await getAllConfig();

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">시스템 설정</h1>
      <SettingsForm initialConfig={config as Record<string, string>} />
    </div>
  );
}
