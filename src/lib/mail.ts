import { Resend } from "resend";

export interface SendNotificationEmailParams {
  to: string;
  userName?: string;
  title: string;
  message: string;
  link?: string | null;
  type?: string;
}

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  return new Resend(apiKey.trim());
};

const getTypeConfig = (type?: string) => {
  switch (type) {
    case "TASK_ASSIGNED":
      return {
        label: "Task Ditugaskan",
        color: "#3b82f6",
        bgColor: "rgba(59, 130, 246, 0.15)",
        borderColor: "rgba(59, 130, 246, 0.35)",
      };
    case "TASK_DELIVERED":
      return {
        label: "Deliverable Diserahkan",
        color: "#a855f7",
        bgColor: "rgba(168, 85, 247, 0.15)",
        borderColor: "rgba(168, 85, 247, 0.35)",
      };
    case "TASK_REVISION":
      return {
        label: "Permintaan Revisi",
        color: "#f59e0b",
        bgColor: "rgba(245, 158, 11, 0.15)",
        borderColor: "rgba(245, 158, 11, 0.35)",
      };
    case "TASK_APPROVED":
      return {
        label: "Task Disetujui",
        color: "#10b981",
        bgColor: "rgba(16, 185, 129, 0.15)",
        borderColor: "rgba(16, 185, 129, 0.35)",
      };
    case "TASK_DONE":
      return {
        label: "Task Selesai",
        color: "#10b981",
        bgColor: "rgba(16, 185, 129, 0.15)",
        borderColor: "rgba(16, 185, 129, 0.35)",
      };
    default:
      return {
        label: "Pemberitahuan",
        color: "#60a5fa",
        bgColor: "rgba(96, 165, 250, 0.15)",
        borderColor: "rgba(96, 165, 250, 0.35)",
      };
  }
};

/**
 * Sends a notification email to a user via Resend.
 * Fails safely without breaking caller action if Resend API key is missing or fails.
 */
export async function sendNotificationEmail({
  to,
  userName = "Team Member",
  title,
  message,
  link,
  type = "INFO",
}: SendNotificationEmailParams) {
  const resend = getResendClient();

  if (!resend) {
    console.warn(
      `[Mail] RESEND_API_KEY is not configured in .env. Skipping email notification to ${to}.`
    );
    return { success: false, reason: "NO_API_KEY" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const fullLink = link
    ? link.startsWith("http")
      ? link
      : `${appUrl.replace(/\/$/, "")}${link.startsWith("/") ? "" : "/"}${link}`
    : appUrl;

  const typeConfig = getTypeConfig(type);
  const senderEmail = process.env.EMAIL_FROM || "Locomotion Agency <onboarding@resend.dev>";

  try {
    const { data, error } = await resend.emails.send({
      from: senderEmail,
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
            .card {
              background-color: #111827;
              border: 1px solid #1f2937;
              border-radius: 16px;
              padding: 32px;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }
            .badge {
              display: inline-block;
              padding: 5px 12px;
              font-size: 11px;
              font-weight: 700;
              border-radius: 9999px;
              background-color: ${typeConfig.bgColor};
              color: ${typeConfig.color};
              border: 1px solid ${typeConfig.borderColor};
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
              border-left: 3px solid ${typeConfig.color};
              padding: 16px;
              border-radius: 8px;
              color: #e5e7eb;
              font-size: 14px;
              line-height: 1.6;
              margin: 16px 0 24px 0;
            }
            .cta-container {
              text-align: center;
              margin: 28px 0 16px 0;
            }
            .btn {
              display: inline-block;
              background-color: #2563eb;
              color: #ffffff !important;
              font-weight: 600;
              font-size: 14px;
              padding: 12px 28px;
              border-radius: 10px;
              text-decoration: none;
              box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
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
              <div class="badge">${typeConfig.label}</div>
              <h1>${title}</h1>
              <p class="greeting">Halo <strong>${userName}</strong>,</p>
              <div class="message-box">${message}</div>
              
              ${
                link
                  ? `<div class="cta-container">
                      <a href="${fullLink}" class="btn" target="_blank">Buka di Workspace &rarr;</a>
                    </div>`
                  : ""
              }

              <div class="footer">
                Email ini dikirim secara otomatis oleh <strong>Locomotion Internal System</strong>.<br>
                Jika Anda memiliki kendala teknis, silakan hubungi tim IT/Admin.
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("[Mail] Resend returned error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("[Mail] Exception sending email with Resend:", err);
    return { success: false, error: err.message };
  }
}
