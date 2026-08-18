/**
 * The pieces every Versa email is built from.
 *
 * Written as inline-styled tables rather than anything modern: email clients
 * have no flexbox, no grid, no external stylesheets and — in Outlook's case —
 * a Word rendering engine.
 *
 * The visual language follows the storefront: white ground, near-black text,
 * uppercase small-caps labels, hairline rules, nothing rounded.
 */

export const INK = '#171717';
export const SLATE = '#525252';
export const MUTE = '#737373';
export const LINE = '#e3e3e1';

/**
 * Escapes anything that reaches the HTML body. Names, addresses and account
 * details are all user-entered, and an unescaped apostrophe or angle bracket
 * would corrupt the markup.
 */
export function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param footNote why this message reached the recipient — required, because
 *   the honest answer differs per message and a wrong one reads as spam.
 */
export function shell(body: string, footNote: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Versa Collections</title></head>
<body style="margin:0;padding:0;background:#f4f4f3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f3;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border:1px solid ${LINE};">
        <tr><td style="padding:32px 32px 8px 32px;text-align:center;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.34em;
                      text-transform:uppercase;color:${INK};">Versa</div>
          <div style="font-size:9px;letter-spacing:0.5em;text-transform:uppercase;color:${MUTE};
                      margin-top:6px;">Collections</div>
        </td></tr>
        <tr><td style="padding:24px 32px 32px 32px;font-family:Helvetica,Arial,sans-serif;">
          ${body}
        </td></tr>
      </table>
      <div style="max-width:560px;margin:16px auto 0;font-family:Helvetica,Arial,sans-serif;
                  font-size:11px;line-height:1.6;color:${MUTE};text-align:center;">
        Versa Collections — Lahore, Pakistan<br>
        ${escape(footNote)}
      </div>
    </td></tr>
  </table>
</body></html>`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 16px 0;font-family:Helvetica,Arial,sans-serif;font-size:22px;
                     font-weight:400;line-height:1.25;color:${INK};">${escape(text)}</h1>`;
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.65;color:${SLATE};">${html}</p>`;
}

export function label(text: string): string {
  return `<div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;
                      color:${MUTE};margin:0 0 8px 0;">${escape(text)}</div>`;
}

export function rule(): string {
  return `<div style="border-top:1px solid ${LINE};margin:24px 0;"></div>`;
}

export function button(href: string, text: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0 0;">
    <tr><td style="background:${INK};">
      <a href="${escape(href)}"
         style="display:inline-block;padding:13px 28px;font-family:Helvetica,Arial,sans-serif;
                font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#ffffff;
                text-decoration:none;">${escape(text)}</a>
    </td></tr>
  </table>`;
}
