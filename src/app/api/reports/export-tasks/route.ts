import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { exportManagementCsvAction } from "@/actions/management";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Unauthorized. Management role required." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const typeParam = (searchParams.get("type") || "COMPLETE").toUpperCase();
  const type =
    typeParam === "SUMMARY" || typeParam === "DETAILED" ? typeParam : "COMPLETE";
  const period = searchParams.get("period") || "ALL";
  const department = searchParams.get("department") || "ALL";

  const result = await exportManagementCsvAction({
    type,
    period,
    department,
  });

  if (!result.success || !result.csvContent) {
    return NextResponse.json(
      { error: result.error || "Failed to generate CSV." },
      { status: 500 }
    );
  }

  const filename = result.filename || "Locomotion_Task_Report.csv";

  return new NextResponse(result.csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
