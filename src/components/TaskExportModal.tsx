"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FileSpreadsheet,
  Download,
  Users,
  CheckCircle2,
  Clock,
  RotateCcw,
  Loader2,
  Calendar,
  Filter,
  Layers,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  getManagementReportPreviewAction,
  exportManagementCsvAction,
  ReportPreviewResult,
  StaffPerformanceReportItem,
  DetailedTaskReportItem,
} from "@/actions/management";

interface TaskExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDepartment?: string;
}

export function TaskExportModal({
  open,
  onOpenChange,
  defaultDepartment = "ALL",
}: TaskExportModalProps) {
  const [period, setPeriod] = useState<string>("ALL");
  const [department, setDepartment] = useState<string>(defaultDepartment);
  const [activeTab, setActiveTab] = useState<"SUMMARY" | "DETAILED">("SUMMARY");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ReportPreviewResult | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadPreviewData(period, department);
    }
  }, [open, period, department]);

  async function loadPreviewData(selectedPeriod: string, selectedDept: string) {
    setIsLoading(true);
    try {
      const data = await getManagementReportPreviewAction({
        period: selectedPeriod,
        department: selectedDept,
      });
      setPreviewData(data);
    } catch (err) {
      console.error("Failed to load report preview:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDownload(type: "COMPLETE" | "SUMMARY" | "DETAILED") {
    setIsExporting(type);
    setDownloadSuccess(null);
    try {
      const res = await exportManagementCsvAction({
        type,
        period,
        department,
      });

      if (res.success && res.csvContent && res.filename) {
        const blob = new Blob([res.csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", res.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setDownloadSuccess(`Berhasil mengunduh "${res.filename}"!`);
        setTimeout(() => setDownloadSuccess(null), 5000);
      } else {
        alert(res.error || "Gagal mengunduh file CSV.");
      }
    } catch (err) {
      console.error("Export CSV error:", err);
      alert("Terjadi kesalahan saat memproses ekspor CSV.");
    } finally {
      setIsExporting(null);
    }
  }

  const departments = [
    { value: "ALL", label: "Semua Departemen" },
    { value: "Creative", label: "Creative" },
    { value: "Media", label: "Media" },
    { value: "Strategy", label: "Strategy" },
    { value: "Tech", label: "Tech" },
    { value: "Accounts", label: "Accounts" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl p-6 sm:p-7 shadow-2xl">
        <DialogHeader className="space-y-2 pb-2 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Export Laporan Kinerja & Audit Task
                <Badge variant="cyan" className="text-[10px] uppercase font-bold tracking-wider">
                  CSV Report
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tarik data kinerja staff, rekapan waktu pengerjaan (timer & revisi), serta detail task bulanan untuk audit manajemen.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-secondary/40 rounded-2xl border border-border/50 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-muted-foreground">Periode:</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-card border border-border rounded-xl px-2.5 py-1.5 text-xs font-semibold text-foreground focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                {previewData?.availablePeriods?.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Selector */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-muted-foreground">Departemen:</span>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="bg-card border border-border rounded-xl px-2.5 py-1.5 text-xs font-semibold text-foreground focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                {departments.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadPreviewData(period, department)}
            disabled={isLoading}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 self-end sm:self-auto"
          >
            <RotateCcw className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Muat Ulang
          </Button>
        </div>

        {/* Executive Summary Metrics KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/60 bg-card p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Total Staff
            </span>
            <p className="text-xl font-black text-foreground mt-1">
              {isLoading ? "..." : previewData?.totals.totalStaffCount ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              Total Task
            </span>
            <p className="text-xl font-black text-foreground mt-1">
              {isLoading ? "..." : previewData?.totals.totalTasks ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Task Selesai
            </span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {isLoading ? "..." : previewData?.totals.completedTasks ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Total Waktu Kerja
            </span>
            <div>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {isLoading ? "..." : `${previewData?.totals.totalHoursDecimal ?? 0}h`}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {previewData?.totals.totalTimeHms ?? "00:00:00"}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher for Preview */}
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("SUMMARY")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "SUMMARY"
                  ? "bg-blue-600 dark:bg-blue-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              👥 Ringkasan Kinerja per Staff ({previewData?.staffSummary?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("DETAILED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "DETAILED"
                  ? "bg-blue-600 dark:bg-blue-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              📋 Rincian Semua Task ({previewData?.tasksList?.length || 0})
            </button>
          </div>

          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Live Preview Table
          </span>
        </div>

        {/* Tab 1: Staff Performance Summary Table */}
        {activeTab === "SUMMARY" && (
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-card/60">
            <div className="overflow-x-auto max-h-56">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-secondary/70 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0">
                    <th className="p-3">Staff Specialist</th>
                    <th className="p-3">Departemen</th>
                    <th className="p-3 text-center">Total Task</th>
                    <th className="p-3 text-center">Selesai</th>
                    <th className="p-3 text-center">Revisi</th>
                    <th className="p-3 text-right">Total Waktu</th>
                    <th className="p-3 text-right">Rata-rata / Task</th>
                    <th className="p-3 text-center">Penyelesaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                        Memuat data preview kinerja...
                      </td>
                    </tr>
                  ) : !previewData?.staffSummary || previewData.staffSummary.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-muted-foreground">
                        Tidak ada data staff untuk filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    previewData.staffSummary.map((staff) => (
                      <tr key={staff.staffId} className="hover:bg-secondary/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={staff.avatarUrl || ""} />
                              <AvatarFallback className="bg-blue-500/10 text-blue-600 text-[10px] font-bold">
                                {staff.staffName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-foreground leading-tight">
                                {staff.staffName}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {staff.position}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium">
                            {staff.department}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-bold text-foreground">
                          {staff.totalTasks}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            {staff.completedTasks}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {staff.totalRevisionRounds > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                              {staff.totalRevisionRounds}x
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <p className="font-mono font-bold text-foreground">
                            {staff.totalTimeHms}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {staff.totalHoursDecimal} jam
                          </p>
                        </td>
                        <td className="p-3 text-right">
                          <p className="font-mono text-muted-foreground">
                            {staff.avgTimeHms}
                          </p>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {staff.completionRate}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Detailed Task List Preview Table */}
        {activeTab === "DETAILED" && (
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-card/60">
            <div className="overflow-x-auto max-h-56">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-secondary/70 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0">
                    <th className="p-3">Judul Task</th>
                    <th className="p-3">Staff Assignee</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Draft Awal</th>
                    <th className="p-3 text-center">Revisi</th>
                    <th className="p-3 text-right">Total Waktu</th>
                    <th className="p-3 text-center">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                        Memuat data preview task...
                      </td>
                    </tr>
                  ) : !previewData?.tasksList || previewData.tasksList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        Tidak ada task yang ditemukan untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    previewData.tasksList.map((t) => (
                      <tr key={t.taskId} className="hover:bg-secondary/30 transition-colors">
                        <td className="p-3 max-w-[200px]">
                          <p className="font-semibold text-foreground truncate" title={t.title}>
                            {t.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {t.projectCode} • {t.clientName}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-foreground">{t.assigneeName}</p>
                          <p className="text-[10px] text-muted-foreground">{t.assigneeDepartment}</p>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              t.status === "Done"
                                ? "success"
                                : t.status === "Revision"
                                ? "destructive"
                                : t.status === "In Review"
                                ? "warning"
                                : "secondary"
                            }
                            className="text-[10px] px-2 py-0.5"
                          >
                            {t.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {t.initialTimeHms}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {t.revisionRoundsCount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              {t.revisionRoundsCount}x ({t.revisionTimeHms})
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          {t.totalTimeHms}
                        </td>
                        <td className="p-3 text-center text-muted-foreground">
                          {t.dueDate || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Success Alert Banner */}
        {downloadSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Download Action Cards Strip */}
        <div className="pt-2 border-t border-border/40 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pilih Format Ekspor CSV:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Option 1: Complete Executive Report (Recommended) */}
            <div className="rounded-2xl border-2 border-blue-500/30 bg-blue-500/5 p-4 flex flex-col justify-between hover:border-blue-500 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="cyan" className="text-[9px] font-bold uppercase">
                    Rekomendasi
                  </Badge>
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  Laporan Lengkap (Eksekutif)
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  Gabungan summary kinerja per staff + telemetri rinci seluruh task dalam 1 file CSV.
                </p>
              </div>
              <Button
                onClick={() => handleDownload("COMPLETE")}
                disabled={isExporting !== null}
                className="mt-3 w-full rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-xs shadow-sm gap-1.5 border-0"
              >
                {isExporting === "COMPLETE" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download Lengkap
              </Button>
            </div>

            {/* Option 2: Staff Summary Only */}
            <div className="rounded-2xl border border-border/70 bg-card p-4 flex flex-col justify-between hover:border-border transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    Format Tabel KPI
                  </span>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  Ringkasan Kinerja Staff
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  Hanya rekap metrik per staff (total task, total jam, rata-rata durasi/task, rasio selesai).
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleDownload("SUMMARY")}
                disabled={isExporting !== null}
                className="mt-3 w-full rounded-xl text-xs font-semibold gap-1.5"
              >
                {isExporting === "SUMMARY" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download Summary
              </Button>
            </div>

            {/* Option 3: Detailed Tasks Telemetry Only */}
            <div className="rounded-2xl border border-border/70 bg-card p-4 flex flex-col justify-between hover:border-border transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    Data Rinci Mentah
                  </span>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  Rincian Seluruh Task
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  Log baris per task, durasi draft awal, putaran revisi, feedback, dan variansi estimasi.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleDownload("DETAILED")}
                disabled={isExporting !== null}
                className="mt-3 w-full rounded-xl text-xs font-semibold gap-1.5"
              >
                {isExporting === "DETAILED" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download Rincian Task
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
