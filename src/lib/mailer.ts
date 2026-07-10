/**
 * Email transport abstraction. No SMTP/provider credentials are wired yet:
 * in development the message is logged to the server console (and the
 * reset URL surfaced to the caller for manual testing); in production it
 * logs a loud warning so a missing transport is impossible to miss.
 *
 * To go live, implement `send()` with Resend/SES/SMTP — callers don't
 * change.
 */

interface Mail {
  to: string;
  subject: string;
  text: string;
}

async function send(mail: Mail): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.warn(
      `[mailer] No email transport configured — mail to ${mail.to} (\"${mail.subject}\") was NOT sent.`,
    );
    return;
  }
  console.log(
    `\n[mailer:dev] To: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}\n`,
  );
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  await send({
    to,
    subject: "Reset your SendYurt password",
    text:
      `Someone (hopefully you) asked to reset the password for this SendYurt account.\n\n` +
      `Reset link (valid for 1 hour):\n${resetUrl}\n\n` +
      `If you didn't ask for this, you can safely ignore this email.`,
  });
}
