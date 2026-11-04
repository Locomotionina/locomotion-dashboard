import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export const RESEND_SENDER_EMAIL =
  process.env.EMAIL_FROM || "Locomotion Agency <notifikasi@locomotiondashboardtracker.web.id>";

export const BASE_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://locomotiondashboardtracker.web.id";

export type TaskEmailEventType =
  | "TASK_ASSIGNED"       // 1. Task Delegated
  | "TASK_DELEGATED"      // 1. Task Delegated (alias)
  | "PREVIEW_REQUESTED"   // 2. Preview Requested
  | "REVISION_DELIVERED"  // 3. Revision Delivered
  | "TASK_DELIVERED"      // legacy alias for preview/revision delivery
  | "TASK_REVISION"       // 4. Revision Feedback
  | "TASK_APPROVED";      // 4. Task Approved

export interface SendTaskEmailParams {
  to: string;
  userName?: string;
  title: string;
  message: string;
  link?: string | null;
  type: TaskEmailEventType | string;
  taskId?: string;

  // Dynamic Rich Task Metadata
  taskTitle?: string;
  projectName?: string;
  outputType?: string;
  priority?: string;
  dueDate?: Date | string | null;
  estimatedHours?: number | null;
  reviewerNames?: string[] | string | null;
  brief?: string | null;
  actorName?: string | null;
  revisionRound?: number | null;
  revisionNote?: string | null;
  revisionAuthor?: string | null;
}

const getResendClient = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  return new Resend(apiKey.trim());
};

function escapeHtml(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderPriorityBadge(priority?: string | null): string {
  const p = (priority || "MEDIUM").toUpperCase().trim();
  if (p === "URGENT" || p === "P0") {
    return `<span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; border-radius: 6px; background-color: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5;">P0 / Urgent</span>`;
  }
  if (p === "HIGH" || p.includes("HIGH")) {
    return `<span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; border-radius: 6px; background-color: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5;">P0 / High</span>`;
  }
  if (p === "MEDIUM" || p === "P1" || p.includes("MED")) {
    return `<span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; border-radius: 6px; background-color: #FEF3C7; color: #92400E; border: 1px solid #FCD34D;">Medium</span>`;
  }
  return `<span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; border-radius: 6px; background-color: #F1F5F9; color: #475569; border: 1px solid #CBD5E1;">Low</span>`;
}

function formatEmailDate(dateVal?: Date | string | null): string {
  if (!dateVal) return "Tidak ditentukan";
  try {
    const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return "Tidak ditentukan";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Tidak ditentukan";
  }
}

function formatEstimatedHours(hours?: number | null): string {
  if (hours === null || hours === undefined || isNaN(Number(hours))) {
    return "4.0 Hours";
  }
  return `${Number(hours).toFixed(1)} Hours`;
}

function formatReviewers(reviewers?: string[] | string | null): string {
  if (!reviewers) return "-";
  if (Array.isArray(reviewers)) {
    const valid = reviewers.map((r) => r.trim()).filter(Boolean);
    return valid.length > 0 ? valid.join(", ") : "-";
  }
  return reviewers.trim() || "-";
}

export interface TaskEventConfig {
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  senderLabel: string;
  ctaLabel: string;
  blockType: "BRIEF" | "REVISION_DELIVERED" | "REVISION_FEEDBACK" | "APPROVAL";
}

export function getTaskEventConfig(type?: string): TaskEventConfig {
  switch (type) {
    case "TASK_ASSIGNED":
    case "TASK_DELEGATED":
      return {
        badgeText: "BARU DITUGASKAN",
        badgeBg: "#F3E8FF",
        badgeColor: "#7E22CE",
        badgeBorder: "#D8B4FE",
        senderLabel: "Ditugaskan oleh:",
        ctaLabel: "Buka & Kerjakan Task →",
        blockType: "BRIEF",
      };
    case "PREVIEW_REQUESTED":
    case "TASK_DELIVERED":
      return {
        badgeText: "REQUEST PREVIEW",
        badgeBg: "#EFF6FF",
        badgeColor: "#1D4ED8",
        badgeBorder: "#BFDBFE",
        senderLabel: "Diajukan oleh:",
        ctaLabel: "Tinjau Hasil Preview →",
        blockType: "BRIEF",
      };
    case "REVISION_DELIVERED":
      return {
        badgeText: "REVISI BARU",
        badgeBg: "#FFF7ED",
        badgeColor: "#C2410C",
        badgeBorder: "#FED7AA",
        senderLabel: "Diserahkan oleh:",
        ctaLabel: "Periksa Hasil Revisi →",
        blockType: "REVISION_DELIVERED",
      };
    case "TASK_REVISION":
      return {
        badgeText: "REVISI BARU",
        badgeBg: "#FEF2F2",
        badgeColor: "#B91C1C",
        badgeBorder: "#FECACA",
        senderLabel: "Catatan dari Reviewer:",
        ctaLabel: "Buka Catatan Revisi →",
        blockType: "REVISION_FEEDBACK",
      };
    case "TASK_APPROVED":
      return {
        badgeText: "DITETAPKAN / APPROVED",
        badgeBg: "#ECFDF5",
        badgeColor: "#047857",
        badgeBorder: "#A7F3D0",
        senderLabel: "Disetujui oleh:",
        ctaLabel: "Lihat Task Selesai →",
        blockType: "APPROVAL",
      };
    default:
      return {
        badgeText: "PEMBERITAHUAN TASK",
        badgeBg: "#F1F5F9",
        badgeColor: "#334155",
        badgeBorder: "#CBD5E1",
        senderLabel: "Pengirim:",
        ctaLabel: "Buka di Workspace →",
        blockType: "BRIEF",
      };
  }
}

/**
 * Pure HTML rendering function that compiles the modern, responsive email template.
 */
export function renderTaskEmailHtml(params: SendTaskEmailParams): string {
  const {
    userName = "Team Member",
    title,
    message,
    link,
    type = "INFO",
    taskTitle = title,
    projectName = "General / Workspace",
    outputType = "Standard Task",
    priority = "MEDIUM",
    dueDate = null,
    estimatedHours = 4.0,
    reviewerNames = "-",
    brief = null,
    actorName = "Tim Locomotion",
    revisionRound = 1,
    revisionNote = null,
    revisionAuthor = null,
  } = params;

  const appUrl = BASE_APP_URL.replace(/\/$/, "");
  const managementUrl = `${appUrl}/management`;
  const fullLink = link
    ? link.startsWith("http")
      ? link
      : `${appUrl}${link.startsWith("/") ? "" : "/"}${link}`
    : `${appUrl}/dashboard`;

  const config = getTaskEventConfig(type);
  const priorityBadge = renderPriorityBadge(priority);
  const dueDateFormatted = formatEmailDate(dueDate);
  const estimatedHoursFormatted = formatEstimatedHours(estimatedHours);
  const reviewersFormatted = formatReviewers(reviewerNames);

  // Structured Content Block (Conditional)
  let contentBlockHtml = "";
  if (config.blockType === "BRIEF") {
    const briefContent = brief && brief.trim() ? brief.trim() : message;
    contentBlockHtml = `
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #6366F1; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <div style="font-size: 11px; font-weight: 700; color: #6366F1; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          Task Brief / Instruction
        </div>
        <div style="font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap;">
          ${escapeHtml(briefContent)}
        </div>
      </div>
    `;
  } else if (config.blockType === "REVISION_DELIVERED") {
    const roundNumber = revisionRound && revisionRound > 0 ? revisionRound : 1;
    const author = revisionAuthor || actorName || "Assignee";
    const noteContent = revisionNote && revisionNote.trim() ? revisionNote.trim() : message;
    contentBlockHtml = `
      <div style="background-color: #FFFBEB; border: 1px solid #FCD34D; border-left: 4px solid #D97706; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <div style="font-size: 11px; font-weight: 800; color: #B45309; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          Catatan Revisi #${roundNumber} &bull; Diserahkan oleh: ${escapeHtml(author)}
        </div>
        <div style="font-size: 13px; color: #1E293B; line-height: 1.6; white-space: pre-wrap;">
          ${escapeHtml(noteContent)}
        </div>
      </div>
    `;
  } else if (config.blockType === "REVISION_FEEDBACK") {
    const roundNumber = revisionRound && revisionRound > 0 ? revisionRound : 1;
    const author = revisionAuthor || actorName || "Reviewer";
    const noteContent = revisionNote && revisionNote.trim() ? revisionNote.trim() : message;
    contentBlockHtml = `
      <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-left: 4px solid #DC2626; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <div style="font-size: 11px; font-weight: 800; color: #B91C1C; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          Catatan Revisi #${roundNumber} &bull; Penulis Catatan: ${escapeHtml(author)}
        </div>
        <div style="font-size: 13px; color: #1E293B; line-height: 1.6; white-space: pre-wrap;">
          ${escapeHtml(noteContent)}
        </div>
      </div>
    `;
  } else if (config.blockType === "APPROVAL") {
    const roundSuffix = revisionRound && revisionRound > 0 ? ` &bull; Revisi Round #${revisionRound}` : "";
    const author = revisionAuthor || actorName || "Reviewer / Management";
    const noteContent =
      revisionNote && revisionNote.trim()
        ? revisionNote.trim()
        : "Task telah ditinjau dan secara resmi disetujui tanpa catatan revisi tambahan. Status resmi menjadi Done.";
    contentBlockHtml = `
      <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-left: 4px solid #059669; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <div style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          Status Persetujuan Final &bull; Disetujui oleh: ${escapeHtml(author)}${roundSuffix}
        </div>
        <div style="font-size: 13px; color: #064E3B; line-height: 1.6; white-space: pre-wrap;">
          ${escapeHtml(noteContent)}
        </div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      padding: 32px 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0F172A;
      color: #1E293B;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 580px;
      margin: 0 auto;
    }
    .card {
      background-color: #FFFFFF;
      border: 1px solid #1E293B;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
    }
    .brand-bar {
      background-color: #0F172A;
      padding: 18px 28px;
      border-bottom: 1px solid #1E293B;
    }
    .card-body {
      padding: 28px;
    }
    .btn:hover {
      background-color: #1D4ED8 !important;
      box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45) !important;
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 16px 8px !important;
      }
      .card-body {
        padding: 20px 16px !important;
      }
      .brand-bar {
        padding: 14px 16px !important;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <!-- Dark Brand Header -->
      <div class="brand-bar">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="left" style="vertical-align: middle;">
              <span style="font-size: 14px; font-weight: 800; letter-spacing: 1.2px; color: #FFFFFF; text-transform: uppercase;">
                LOCOMOTION AGENCY
              </span>
            </td>
            <td align="right" style="vertical-align: middle;">
              <span style="font-size: 11px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">
                Task Notification
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Crisp White Card Body -->
      <div class="card-body">
        <!-- Event Type Badge -->
        <div style="margin-bottom: 12px;">
          <span style="display: inline-block; padding: 5px 14px; font-size: 11px; font-weight: 800; border-radius: 9999px; background-color: ${config.badgeBg}; color: ${config.badgeColor}; border: 1px solid ${config.badgeBorder}; text-transform: uppercase; letter-spacing: 0.5px;">
            ${config.badgeText}
          </span>
        </div>

        <!-- Task Title -->
        <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #0F172A; line-height: 1.35; letter-spacing: -0.3px;">
          ${escapeHtml(taskTitle)}
        </h1>

        <!-- Header / Meta Details -->
        <div style="font-size: 13px; color: #64748B; margin-bottom: 18px; line-height: 1.5;">
          ${config.senderLabel} <strong style="color: #0F172A;">${escapeHtml(actorName)}</strong>
          ${userName ? ` &bull; Penerima: <strong style="color: #0F172A;">${escapeHtml(userName)}</strong>` : ""}
        </div>

        <!-- Greeting & Context Summary -->
        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
          Halo <strong style="color: #0F172A;">${escapeHtml(userName)}</strong>,<br>
          ${escapeHtml(message)}
        </p>

        <!-- Key Specs Grid / Table (Structured Card) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin: 20px 0; border-collapse: separate; border-spacing: 0; overflow: hidden;">
          <tr>
            <td width="50%" style="padding: 14px 16px; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Project / Board</div>
              <div style="font-size: 13px; font-weight: 700; color: #1E293B; line-height: 1.4;">${escapeHtml(projectName)}</div>
            </td>
            <td width="50%" style="padding: 14px 16px; border-bottom: 1px solid #E2E8F0; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Output Type</div>
              <div style="font-size: 13px; font-weight: 700; color: #1E293B; line-height: 1.4;">${escapeHtml(outputType)}</div>
            </td>
          </tr>
          <tr>
            <td width="50%" style="padding: 14px 16px; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Priority</div>
              <div style="font-size: 13px; line-height: 1.4;">
                ${priorityBadge}
              </div>
            </td>
            <td width="50%" style="padding: 14px 16px; border-bottom: 1px solid #E2E8F0; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Tenggat Waktu (Due Date)</div>
              <div style="font-size: 13px; font-weight: 700; color: #1E293B; line-height: 1.4;">${dueDateFormatted}</div>
            </td>
          </tr>
          <tr>
            <td width="50%" style="padding: 14px 16px; border-right: 1px solid #E2E8F0; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Estimasi Waktu</div>
              <div style="font-size: 13px; font-weight: 700; color: #1E293B; line-height: 1.4;">${estimatedHoursFormatted}</div>
            </td>
            <td width="50%" style="padding: 14px 16px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Tim Reviewer</div>
              <div style="font-size: 13px; font-weight: 700; color: #1E293B; line-height: 1.4;">${escapeHtml(reviewersFormatted)}</div>
            </td>
          </tr>
        </table>

        <!-- Content Block (Conditional) -->
        ${contentBlockHtml}

        <!-- CTA Button -->
        <div style="text-align: center; margin: 28px 0 20px 0;">
          <a href="${fullLink}" class="btn" target="_blank" style="display: inline-block; background-color: #2563EB; color: #FFFFFF !important; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35); letter-spacing: 0.2px;">
            ${config.ctaLabel}
          </a>
        </div>

        <!-- Management Link -->
        <div style="text-align: center; font-size: 12px; color: #64748B; margin-top: 14px;">
          Tinjau seluruh proyek di <a href="${managementUrl}" target="_blank" style="color: #2563EB; text-decoration: none; font-weight: 600;">Management Overview</a>
        </div>

        <!-- Sleek Footer -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B; text-align: center; line-height: 1.6;">
          Email ini dikirim secara otomatis oleh <strong>Locomotion Internal System</strong>.<br>
          Domain resmi: <a href="${appUrl}" style="color: #2563EB; text-decoration: none; font-weight: 600;">locomotiondashboardtracker.web.id</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends automated email notification via Resend with rich metadata.
 * Completely safe against runtime exceptions: wrapped in try-catch so it NEVER
 * blocks the calling database transaction or core application logic.
 */
export async function sendTaskNotificationEmail(params: SendTaskEmailParams) {
  try {
    const resend = getResendClient();

    if (!resend) {
      console.warn(
        `[Resend] RESEND_API_KEY is not configured in environment. Skipping email notification to ${params.to}.`
      );
      return { success: false, reason: "NO_API_KEY" };
    }

    // Dynamic Task Metadata Enrichment from database if taskId is provided and fields are missing
    let enrichedParams = { ...params };

    if (
      params.taskId &&
      (!params.taskTitle || !params.projectName || !params.outputType || !params.priority)
    ) {
      try {
        const task = await prisma.task.findUnique({
          where: { id: params.taskId },
          include: {
            project: { select: { name: true } },
            createdBy: { select: { name: true } },
            reviewer: { select: { name: true } },
            revisions: { orderBy: { round: "desc" }, take: 1 },
          },
        });

        if (task) {
          enrichedParams.taskTitle = params.taskTitle || task.title;
          enrichedParams.projectName =
            params.projectName || task.project?.name || "General / Workspace";
          enrichedParams.outputType =
            params.outputType || task.taskOutputType || "Standard Task";
          enrichedParams.priority = params.priority || task.priority || "MEDIUM";
          enrichedParams.dueDate =
            params.dueDate !== undefined ? params.dueDate : task.dueDate;
          enrichedParams.estimatedHours =
            params.estimatedHours !== undefined ? params.estimatedHours : task.estimatedHours;
          enrichedParams.brief = params.brief || task.description;
          enrichedParams.actorName =
            params.actorName || task.createdBy?.name || "Tim Locomotion";

          if (task.currentRevisionRound) {
            enrichedParams.revisionRound =
              params.revisionRound || task.currentRevisionRound;
          }

          if (task.revisions && task.revisions.length > 0) {
            const latestRev = task.revisions[0];
            enrichedParams.revisionRound =
              params.revisionRound || latestRev.round;
            enrichedParams.revisionNote =
              params.revisionNote || latestRev.feedback;
            enrichedParams.revisionAuthor =
              params.revisionAuthor || latestRev.authorName || enrichedParams.actorName;
          }

          if (!params.reviewerNames) {
            let rIds: string[] = [];
            if (task.reviewerIds) {
              try {
                const parsed = JSON.parse(task.reviewerIds);
                rIds = Array.isArray(parsed) ? parsed : [parsed];
              } catch {
                rIds = task.reviewerIds.split(",").map((s) => s.trim()).filter(Boolean);
              }
            }
            if (rIds.length === 0 && task.reviewerId) {
              rIds.push(task.reviewerId);
            }
            if (rIds.length > 0) {
              const reviewers = await prisma.user.findMany({
                where: { id: { in: rIds } },
                select: { name: true },
              });
              enrichedParams.reviewerNames = reviewers.map((r) => r.name);
            } else if (task.reviewer?.name) {
              enrichedParams.reviewerNames = [task.reviewer.name];
            }
          }
        }
      } catch (dbErr) {
        console.warn("[Resend] Safe fallback when querying task metadata:", dbErr);
      }
    }

    const htmlContent = renderTaskEmailHtml(enrichedParams);

    const { data, error } = await resend.emails.send({
      from: RESEND_SENDER_EMAIL,
      to: [params.to],
      subject: `[Locomotion] ${params.title}`,
      html: htmlContent,
    });

    if (error) {
      console.error("[Resend] API returned error response:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err: any) {
    // Non-blocking guarantee: catch any network or client error
    console.error("[Resend] Safe exception caught while sending email:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

// Backward-compatible export
export const sendNotificationEmail = sendTaskNotificationEmail;
