import { Resend } from "resend";

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
  taskTitle?: string;
  actorName?: string;
}

const getResendClient = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  return new Resend(apiKey.trim());
};

const getEventConfig = (type?: string) => {
  switch (type) {
    case "TASK_ASSIGNED":
    case "TASK_DELEGATED":
      return {
        label: "Task Delegated / Baru Ditugaskan",
        color: "#6366f1",
        bgColor: "rgba(99, 102, 241, 0.15)",
        borderColor: "rgba(99, 102, 241, 0.35)",
        ctaLabel: "Buka Task di Workspace",
      };
    case "PREVIEW_REQUESTED":
      return {
        label: "Preview Requested / Butuh Review",
        color: "#3b82f6",
        bgColor: "rgba(59, 130, 246, 0.15)",
        borderColor: "rgba(59, 130, 246, 0.35)",
        ctaLabel: "Tinjau Preview Task",
      };
    case "REVISION_DELIVERED":
    case "TASK_DELIVERED":
      return {
        label: "Revision Delivered / Hasil Revisi",
        color: "#f59e0b",
        bgColor: "rgba(245, 158, 11, 0.15)",
        borderColor: "rgba(245, 158, 11, 0.35)",
        ctaLabel: "Periksa Hasil Revisi",
      };
    case "TASK_REVISION":
      return {
        label: "Revision Feedback / Catatan Revisi",
        color: "#f43f5e",
        bgColor: "rgba(244, 63, 94, 0.15)",
        borderColor: "rgba(244, 63, 94, 0.35)",
        ctaLabel: "Buka Catatan Revisi",
      };
    case "TASK_APPROVED":
      return {
        label: "Task Approved / Disetujui",
        color: "#10b981",
        bgColor: "rgba(16, 185, 129, 0.15)",
        borderColor: "rgba(16, 185, 129, 0.35)",
        ctaLabel: "Lihat Task Selesai",
      };
    default:
      return {
        label: "Pemberitahuan Task",
        color: "#60a5fa",
        bgColor: "rgba(96, 165, 250, 0.15)",
        borderColor: "rgba(96, 165, 250, 0.35)",
        ctaLabel: "Buka di Workspace",
      };
  }
};

/**
 * Sends automated email notification via Resend.
 * Completely safe against runtime exceptions: wrapped in try-catch so it NEVER
 * blocks the calling database transaction or core application logic.
 */
export async function sendTaskNotificationEmail({
  to,
  userName = "Team Member",
  title,
  message,
  link,
  type = "INFO",
}: SendTaskEmailParams) {
  try {
    const resend = getResendClient();

    if (!resend) {
      console.warn(
        `[Resend] RESEND_API_KEY is not configured in environment. Skipping email notification to ${to}.`
      );
      return { success: false, reason: "NO_API_KEY" };
    }

    const appUrl = BASE_APP_URL.replace(/\/$/, "");
    const fullLink = link
      ? link.startsWith("http")
        ? link
        : `${appUrl}${link.startsWith("/") ? "" : "/"}${link}`
      : `${appUrl}/dashboard`;

    const managementUrl = `${appUrl}/management`;
    const eventConfig = getEventConfig(type);

    const { data, error } = await resend.emails.send({
      from: RESEND_SENDER_EMAIL,
      to: [to],
      subject: `[Locomotion] ${title}`,
      html: `
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            body {
              margin: 0;
              padding: 24px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #0b0f19;
              color: #f3f4f6;
            }
            .wrapper {
              max-width: 560px;
              margin: 0 auto;
            }
            .card {
              background-color: #111827;
              border: 1px solid #1f2937;
              border-radius: 16px;
              padding: 32px;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }
            .brand-header {
              display: flex;
              align-items: center;
              margin-bottom: 24px;
              padding-bottom: 16px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }
            .brand-title {
              font-size: 16px;
              font-weight: 800;
              letter-spacing: 0.5px;
              color: #ffffff;
              text-transform: uppercase;
            }
            .badge {
              display: inline-block;
              padding: 6px 14px;
              font-size: 11px;
              font-weight: 700;
              border-radius: 9999px;
              background-color: ${eventConfig.bgColor};
              color: ${eventConfig.color};
              border: 1px solid ${eventConfig.borderColor};
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 16px;
            }
            h1 {
              color: #ffffff;
              font-size: 20px;
              margin: 0 0 12px 0;
              font-weight: 700;
              line-height: 1.4;
            }
            .greeting {
              color: #9ca3af;
              font-size: 14px;
              margin: 0 0 16px 0;
            }
            .message-box {
              background-color: #1a2234;
              border-left: 3px solid ${eventConfig.color};
              padding: 16px;
              border-radius: 8px;
              color: #e5e7eb;
              font-size: 14px;
              line-height: 1.6;
              margin: 16px 0 24px 0;
            }
            .cta-container {
              text-align: center;
              margin: 28px 0 20px 0;
            }
            .btn {
              display: inline-block;
              background-color: #2563eb;
              color: #ffffff !important;
              font-weight: 600;
              font-size: 14px;
              padding: 13px 30px;
              border-radius: 10px;
              text-decoration: none;
              box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
            }
            .sub-links {
              text-align: center;
              font-size: 12px;
              color: #9ca3af;
              margin-top: 16px;
            }
            .sub-links a {
              color: #60a5fa;
              text-decoration: none;
            }
            .footer {
              margin-top: 32px;
              padding-top: 20px;
              border-top: 1px solid rgba(255, 255, 255, 0.08);
              font-size: 11px;
              color: #6b7280;
              text-align: center;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="card">
              <div class="brand-header">
                <span class="brand-title">LOCOMOTION AGENCY</span>
              </div>
              <div class="badge">${eventConfig.label}</div>
              <h1>${title}</h1>
              <p class="greeting">Halo <strong>${userName}</strong>,</p>
              <div class="message-box">${message}</div>
              
              <div class="cta-container">
                <a href="${fullLink}" class="btn" target="_blank">${eventConfig.ctaLabel} &rarr;</a>
              </div>

              <div class="sub-links">
                Tinjau seluruh proyek di <a href="${managementUrl}" target="_blank">Management Overview</a>
              </div>

              <div class="footer">
                Email ini dikirim secara otomatis oleh <strong>Locomotion Internal System</strong>.<br>
                Domain resmi: <a href="${appUrl}" style="color: #9ca3af;">locomotiondashboardtracker.web.id</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
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
