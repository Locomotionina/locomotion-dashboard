"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Loader2,
  Briefcase,
  Clock,
  Sparkles,
  AlertTriangle,
  Flame,
  Layers,
  CheckCircle2,
  FileText,
} from "lucide-react";
import {
  exportSingleStaffReportAction,
  SingleStaffReportData,
} from "@/actions/management";

interface StaffReportModalProps {
  staffId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffName?: string;
}

export function StaffReportModal({
  staffId,
  open,
  onOpenChange,
  staffName,
}: StaffReportModalProps) {
  const [data, setData] = useState<SingleStaffReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open && staffId) {
      loadReportData(staffId);
    } else {
      setData(null);
      setCopied(false);
      setDownloadSuccess(null);
    }
  }, [open, staffId]);

  async function loadReportData(id: string) {
    setLoading(true);
    try {
      const res = await exportSingleStaffReportAction(id);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load staff report:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleCopyNarrative = async () => {
    if (!data?.narrativeSummary) return;
    try {
      await navigator.clipboard.writeText(data.narrativeSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy narrative:", err);
    }
  };

  const handleDownloadCsv = () => {
    if (!data?.csvContent || !data?.filename) return;

    const blob = new Blob([data.csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", data.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(`Berhasil mengunduh "${data.filename}"!`);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden shadow-2xl border border-border/80">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-secondary/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-blue-500/30">
                <AvatarImage src={data?.staff.avatarUrl || ""} />
                <AvatarFallback className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                  {data?.staff.name ? data.staff.name[0] : staffName ? staffName[0] : "S"}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>{data?.staff.name || staffName || "Staff Specialist"}</span>
                  {data?.staff.department && (
                    <Badge variant="outline" className="text-[10px] font-semibold rounded-full">
                      {data.staff.department}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {data?.staff.position || "Laporan Kinerja & Rekapitulasi Tugas Individual"}
                </DialogDescription>
              </div>
            </div>

            {data?.staff.capacityStatus && (
              <div>
                {data.staff.capacityStatus === "OVERLOADED" ? (
                  <Badge variant="destructive" className="gap-1 text-xs px-2.5 py-1">
                    <Flame className="h-3.5 w-3.5" />
                    <span>Overloaded ({data.staff.activeCount} Task)</span>
                  </Badge>
                ) : data.staff.capacityStatus === "AVAILABLE" ? (
                  <Badge variant="success" className="gap-1 text-xs px-2.5 py-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Available / Siap Brief ({data.staff.activeCount} Task)</span>
                  </Badge>
                ) : (
                  <Badge variant="cyan" className="text-xs px-2.5 py-1">
                    Optimal Flow ({data.staff.activeCount} Task)
                  </Badge>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-xs text-muted-foreground font-medium">
              Menghitung waktu efektif pengerjaan & menyusun ringkasan naratif...
            </p>
          </div>
        ) : data ? (
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* 4 Quick Stat Pill Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-border/60 bg-card/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Briefcase className="h-3 w-3 text-blue-600 dark:text-blue-400" /> Klien (PIC)
                </span>
                <p className="text-lg font-black text-foreground">{data.staff.clientCount} Brand</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {data.staff.clientNames.length > 0 ? data.staff.clientNames.join(", ") : "Internal Agensi"}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-card/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3 text-cyan-600 dark:text-cyan-400" /> Tugas Aktif
                </span>
                <p className="text-lg font-black text-foreground">{data.staff.activeCount} Task</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {data.staff.todoCount} To Do • {data.staff.inProgressCount} Progress
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-card/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-purple-600 dark:text-purple-400" /> Waktu Efektif
                </span>
                <p className="text-lg font-black text-foreground">{data.staff.totalEffectiveHoursDecimal} jam</p>
                <p className="text-[10px] font-mono text-muted-foreground truncate">
                  {data.staff.totalEffectiveHms}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-card/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Selesai
                </span>
                <p className="text-lg font-black text-foreground">{data.staff.completedCount} Task</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Rata-rata: {data.staff.avgHoursPerTask}h / task
                </p>
              </div>
            </div>

            {/* Narrative Summary Template Box */}
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/[0.03] dark:bg-blue-500/[0.06] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-blue-500/20">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Template Ringkasan Naratif Eksekutif
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      Siap disalin untuk laporan berkala tim, pesan klien, atau Slack
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyNarrative}
                  className="h-8 gap-1.5 text-xs font-semibold rounded-xl border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Tersalin ke Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Salin Ringkasan Naratif</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Formatted narrative text block */}
              <div className="bg-card/90 rounded-xl p-4 border border-border/60 text-xs text-foreground/90 leading-relaxed font-mono whitespace-pre-line shadow-inner max-h-[220px] overflow-y-auto scrollbar-thin">
                {data.narrativeSummary}
              </div>
            </div>

            {downloadSuccess && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{downloadSuccess}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Gagal memuat data staf.
          </div>
        )}

        <DialogFooter className="p-4 border-t border-border/50 bg-secondary/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            File CSV menyertakan log detail pengerjaan, jam efektif, serta ringkasan naratif.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs h-9"
            >
              Tutup
            </Button>
            <Button
              type="button"
              onClick={handleDownloadCsv}
              disabled={!data}
              className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold shadow-sm text-xs h-9 flex-1 sm:flex-none border-0"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Download CSV Report Staf</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
