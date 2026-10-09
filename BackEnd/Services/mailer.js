// Portal emails: payment reminders and share invitations.
//
// Same Hostinger mailbox and settings as Routes/mail.js (the contact form),
// kept separate so portal email can change without touching that route.
// Sending never throws to the caller: the portal action has already been
// saved, and a mailbox hiccup shouldn't turn it into an error. The result
// says whether it went, so the screen can tell the supervisor.

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const SITE_URL = "https://abavirtual.net";

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

/** A plain, readable layout: a heading, paragraphs, and one button. */
function layout({ heading, paragraphs, buttonLabel, buttonUrl }) {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 14px;line-height:1.5">${p}</p>`)
    .join("");
  const button = buttonUrl
    ? `<p style="margin:22px 0 4px"><a href="${buttonUrl}" style="background:#45B4B3;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block">${escapeHtml(buttonLabel)}</a></p>`
    : "";
  return `<div style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#222;font-size:15px">
  <h2 style="font-size:20px;margin:0 0 16px">${escapeHtml(heading)}</h2>
  ${body}${button}
  <p style="margin:28px 0 0;color:#888;font-size:12px">ABA Virtual · ${SITE_URL}</p>
</div>`;
}

/** @returns {Promise<boolean>} true when the mail server accepted it */
async function send({ to, subject, html, replyTo }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`[MAIL] not configured; skipped "${subject}" to ${to}`);
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"ABA Virtual" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    console.log(`[MAIL] sent "${subject}" to ${to}`);
    return true;
  } catch (err) {
    console.error(`[MAIL] failed "${subject}" to ${to}:`, err.message);
    return false;
  }
}

/** Unpaid supervision fee for one month. Replies go to the supervisor. */
function sendPaymentReminder({ supervisee, supervisor, monthLabel, amount }) {
  const amountLine = amount ? ` The amount due is <strong>${escapeHtml(amount)}</strong>.` : "";
  return send({
    to: supervisee.email,
    replyTo: supervisor.email,
    subject: `Supervision fee reminder — ${monthLabel}`,
    html: layout({
      heading: `Payment reminder for ${monthLabel}`,
      paragraphs: [
        `Hi ${escapeHtml(supervisee.name || "there")},`,
        `This is a reminder that your supervision fee for <strong>${escapeHtml(monthLabel)}</strong> is still unpaid.${amountLine}`,
        `If you've already paid, please reply to this email so ${escapeHtml(supervisor.name || "your supervisor")} can update it.`,
      ],
      buttonLabel: "View my supervision",
      buttonUrl: `${SITE_URL}/portal`,
    }),
  });
}

/** Read-only access to a supervisor's portal was granted to this email. */
function sendShareInvite({ email, supervisor }) {
  const who = escapeHtml(supervisor.name || supervisor.email);
  return send({
    to: email,
    replyTo: supervisor.email,
    subject: `${supervisor.name || "A supervisor"} shared their supervision portal with you`,
    html: layout({
      heading: "You've been given view access",
      paragraphs: [
        `${who} has shared their supervision portal with you on ABA Virtual.`,
        `You can view their supervisees' hours, supervision meetings, assignments and monthly progress. You can't make changes.`,
        `Sign in with <strong>${escapeHtml(email)}</strong> — or create a free account with that address if you don't have one — then open <em>Shared with me</em> from your profile menu.`,
      ],
      buttonLabel: "Open shared portal",
      buttonUrl: `${SITE_URL}/portal/shared`,
    }),
  });
}

/**
 * Sent when a supervisor adds a supervisee. A new account gets its login
 * details, including the temporary password (it must be changed at first
 * sign-in); an existing account is only told it now has the portal.
 */
function sendSuperviseeInvite({ supervisee, supervisor, tempPassword }) {
  const who = escapeHtml(supervisor.name || "Your supervisor");
  const paragraphs = [
    `Hi ${escapeHtml(supervisee.name || "there")},`,
    `${who} has added you as a supervisee on the ABA Virtual supervision portal. You can log your fieldwork hours, see your supervision meetings and assignments, and follow your monthly progress there.`,
  ];
  if (tempPassword) {
    paragraphs.push(
      `Your login details:<br>Email: <strong>${escapeHtml(supervisee.email)}</strong><br>Temporary password: <strong style="font-family:monospace;font-size:16px">${escapeHtml(tempPassword)}</strong>`,
      `You'll be asked to choose your own password the first time you sign in. Please don't share this email.`,
    );
  } else {
    paragraphs.push(
      `Sign in with your existing ABA Virtual account (<strong>${escapeHtml(supervisee.email)}</strong>), then open <em>My supervision</em> from your profile menu.`,
    );
  }
  paragraphs.push(`Questions? Just reply to this email to reach ${who}.`);

  return send({
    to: supervisee.email,
    replyTo: supervisor.email,
    subject: `${supervisor.name || "Your supervisor"} added you to the ABA Virtual supervision portal`,
    html: layout({
      heading: "Welcome to your supervision portal",
      paragraphs,
      buttonLabel: tempPassword ? "Sign in" : "Open my supervision",
      buttonUrl: tempPassword ? `${SITE_URL}/login` : `${SITE_URL}/portal`,
    }),
  });
}

module.exports = { sendPaymentReminder, sendShareInvite, sendSuperviseeInvite };
