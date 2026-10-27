import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAdminUsersAction } from "@/actions/auth";
import { AdminUsersClient } from "./AdminUsersClient";

export const metadata = {
  title: "All Users — HRGA & Executive Admin | Locomotion",
  description: "Executive staff directory, registration approvals, and user suspension management.",
};

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();

  // Strictly accessible only to the ADMIN role
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await getAdminUsersAction();

  return (
    <div className="py-4">
      <AdminUsersClient
        initialUsers={(users as any) || []}
        currentUser={currentUser}
      />
    </div>
  );
}
