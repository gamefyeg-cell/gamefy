import nodemailer, { type Transporter } from "nodemailer";

// Sends transactional email (password reset codes, etc.) via Gmail SMTP
// using an account App Password — see .env.example for setup. Not meant
// for marketing volume: Gmail throttles a personal account to ~500
// messages/day, which is plenty for reset codes but not for bulk mail.

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER and GMAIL_APP_PASSWORD must be set to send email — see .env.example"
    );
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return transporter;
}

export async function sendMail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const from = process.env.GMAIL_USER;
  await getTransporter().sendMail({
    from: `"Gamefy" <${from}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
