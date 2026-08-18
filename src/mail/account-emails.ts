import type { MailMessage } from './mail.service';
import { INK, LINE, MUTE, escape, heading, paragraph, shell } from './layout';

const FOOT_NOTE = 'You are receiving this because a password change was requested for your account.';

export interface PasswordCodeData {
  to: string;
  name: string;
  /** Six digits. Never logged, never stored in the clear. */
  code: string;
  /** How long the code stays usable, in minutes. */
  minutes: number;
}

/**
 * The one-time code that authorises a password change.
 *
 * The code is set in a large, widely spaced monospace so it can be read off a
 * phone without mistaking 0 for O, and it is repeated verbatim in the plain
 * text part — some clients show only that.
 */
export function buildPasswordCodeEmail(d: PasswordCodeData): MailMessage {
  const body = [
    heading('Your password change code'),
    paragraph(`${escape(d.name)}, use this code to set a new password.`),
    `<div style="border:1px solid ${LINE};padding:20px;text-align:center;margin:0 0 16px 0;">
      <div style="font-family:'Courier New',Courier,monospace;font-size:30px;letter-spacing:0.28em;
                  color:${INK};">${escape(d.code)}</div>
    </div>`,
    paragraph(
      `It expires in <strong style="color:${INK}">${d.minutes} minutes</strong> and can be used once.`,
    ),
    paragraph(
      `<span style="color:${MUTE}">If you did not ask to change your password, ignore this email — ` +
        `nothing has changed, and the code is useless on its own.</span>`,
    ),
  ].join('\n');

  return {
    to: d.to,
    subject: `${d.code} is your Versa password change code`,
    html: shell(body, FOOT_NOTE),
    text: [
      `${d.name}, use this code to set a new password.`,
      '',
      `    ${d.code}`,
      '',
      `It expires in ${d.minutes} minutes and can be used once.`,
      '',
      'If you did not ask to change your password, ignore this email — nothing has',
      'changed, and the code is useless on its own.',
      '',
      'Versa Collections — Lahore, Pakistan',
    ].join('\n'),
  };
}
