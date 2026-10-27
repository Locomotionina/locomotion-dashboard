import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getManagementOverviewData } from "@/actions/management";
import { ManagementClient } from "./ManagementClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ArrowRight, ShieldCheck } from "lucide-react";

export default async function ManagementPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  // RBAC Access Control Check (Accessible to MANAGEMENT and ADMIN)
  if (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN") {
    return (
      <div className="max-w-xl mx-auto py-16 animate-fade-in">
        <Card className="border-rose-500/30 bg-card/90 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="h-14 w-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-3 border border-rose-500/20">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div className="flex justify-center mb-1">
              <Badge variant="destructive" className="text-xs">
                RBAC Access Denied
              </Badge>
            </div>
            <CardTitle className="text-xl">Executive Management Only</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              You are signed in as <strong className="text-foreground">{currentUser.name}</strong> with the{" "}
              <strong className="text-indigo-400 font-mono">STAFF</strong> role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
            <p>
              In accordance with Locomotion Agency role-based security policies, global agency capacity monitoring and staff workload analytics are restricted to Management accounts.
            </p>
            <div className="p-3.5 rounded-lg bg-secondary/50 border border-border/60 space-y-1.5">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                <span>Need Management Access?</span>
              </p>
              <p className="text-[11px]">
                Please sign in with your executive management credentials or contact your agency administrator to elevate your account permissions.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <Button asChild className="w-full sm:w-auto flex-1 gap-2">
                <Link href="/dashboard">
                  <span>Back to My Staff Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/projects">
                  <span>Browse Projects</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = await getManagementOverviewData();

  if (!data.authorized || !data.staffSummaries || !data.metrics) {
    redirect("/dashboard");
  }

  return (
    <div className="py-4">
      <ManagementClient
        staffSummaries={data.staffSummaries}
        metrics={data.metrics}
        pendingUsers={data.pendingUsers || []}
        pendingProfileRequests={data.pendingProfileRequests || []}
        pendingPasswordRequests={data.pendingPasswordRequests || []}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
