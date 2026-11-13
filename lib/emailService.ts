
import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const smtpEmail = process.env.SMTP_EMAIL;
  const smtpPassword = process.env.SMTP_APP_PASSWORD;

  if (!smtpEmail || !smtpPassword) {
    throw new Error("Gmail SMTP credentials are missing.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: smtpEmail,
      pass: smtpPassword,
    },
  });

  return transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || "RideMate"}" <${smtpEmail}>`,
    to,
    subject,
    html,
  });
}
