import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ApprovalEmailParams {
  parentEmail: string;
  childName: string;
  approvalToken: string;
  locale: string;
}

export async function sendApprovalEmail({
  parentEmail,
  childName,
  approvalToken,
  locale,
}: ApprovalEmailParams) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const approvalLink = `${appUrl}/api/approve?token=${approvalToken}`;
  const isPt = locale === 'pt';

  const subject = isPt
    ? `${childName} quer aprender a programar! 🤖`
    : `${childName} wants to learn to code! 🤖`;

  await resend.emails.send({
    // Use your verified Resend domain in production.
    // 'onboarding@resend.dev' works for testing when sending to your own account email.
    from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to: parentEmail,
    subject,
    html: buildEmailHtml({ childName, approvalLink, isPt }),
  });
}

function buildEmailHtml({
  childName,
  approvalLink,
  isPt,
}: {
  childName: string;
  approvalLink: string;
  isPt: boolean;
}) {
  const copy = isPt
    ? {
        heading: `${childName} quer começar a aprender programação!`,
        body: `O teu filho ou filha registou-se na <strong>Coding Kids</strong> — uma aplicação divertida e segura que ensina programação a crianças dos 6 aos 12 anos através de jogos interativos.`,
        body2: `Para mantê-los em segurança, precisamos da tua aprovação antes de poderem aceder às lições.`,
        button: '✅ Aprovar a conta',
        safety: `Se não reconheces este pedido, ignora este email. A conta permanecerá bloqueada.`,
        footer: `Coding Kids · Enviado com segurança · Nunca pedimos palavras-passe`,
      }
    : {
        heading: `${childName} is ready to start learning to code!`,
        body: `Your child just signed up for <strong>Coding Kids</strong> — a safe, fun app that teaches programming to kids aged 6–12 through interactive games.`,
        body2: `To keep them safe, we need your approval before they can access any lessons.`,
        button: '✅ Approve their account',
        safety: `If you don't recognise this request, simply ignore this email. Their account will remain locked.`,
        footer: `Coding Kids · Sent securely · We never ask for passwords`,
      };

  return `<!DOCTYPE html>
<html lang="${isPt ? 'pt' : 'en'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#7209B7;padding:32px 40px;text-align:center;">
            <p style="font-size:52px;margin:0;line-height:1;">🤖</p>
            <h1 style="color:#ffffff;font-size:26px;font-weight:900;margin:12px 0 0 0;letter-spacing:-0.5px;">Coding Kids</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#7209B7;font-size:20px;font-weight:900;margin:0 0 20px 0;line-height:1.3;">
              ${copy.heading}
            </h2>
            <p style="color:#444444;font-size:16px;line-height:1.7;margin:0 0 16px 0;">
              ${copy.body}
            </p>
            <p style="color:#444444;font-size:16px;line-height:1.7;margin:0 0 32px 0;">
              ${copy.body2}
            </p>

            <!-- Approval button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:32px;">
                  <a href="${approvalLink}"
                     style="background:#F9C74F;color:#7209B7;padding:18px 40px;border-radius:50px;
                            font-weight:900;font-size:18px;text-decoration:none;display:inline-block;
                            box-shadow:0 4px 0 rgba(0,0,0,0.15);letter-spacing:0.2px;">
                    ${copy.button}
                  </a>
                </td>
              </tr>
            </table>

            <!-- Fallback link -->
            <p style="color:#888888;font-size:13px;line-height:1.6;margin:0 0 24px 0;">
              Button not working? Copy and paste this link into your browser:<br>
              <a href="${approvalLink}" style="color:#7209B7;word-break:break-all;">${approvalLink}</a>
            </p>

            <hr style="border:none;border-top:1px solid #eeeeee;margin:0 0 24px 0;">

            <!-- Safety note -->
            <p style="color:#aaaaaa;font-size:13px;line-height:1.6;margin:0 0 16px 0;">
              🔒 ${copy.safety}
            </p>
            <p style="color:#cccccc;font-size:12px;text-align:center;margin:0;">
              ${copy.footer}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
