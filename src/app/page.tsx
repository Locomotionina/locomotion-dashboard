import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "ADMIN") {
    redirect("/admin/users");
  }

  if (user.role === "MANAGEMENT") {
    redirect("/management");
  }

  redirect("/dashboard");
}
