import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  replyTo: string;
}

/**
 * The one place that talks to an SMTP server.
 *
 * Deliberately a thin seam: everything above it deals in `MailMessage`, so
 * swapping SMTP for an API provider later is a change to this file alone.
 *
 * Nothing here ever throws at the caller. An order that was placed, confirmed
 * or dispatched must not be undone because a mail server was unreachable —
 * `send` reports success or failure and the caller records what happened.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly settings: MailConfig;
  private readonly transporter: Transporter | null;

  constructor(config: ConfigService) {
    this.settings = config.getOrThrow<MailConfig>('app.mail');

    this.transporter = this.configured
      ? createTransport({
          host: this.settings.host,
          port: this.settings.port,
          secure: this.settings.secure,
          auth: { user: this.settings.user, pass: this.settings.password },
          // Without these a dead mail host would hang an admin's request until
          // the socket gave up on its own.
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000,
        })
      : null;
  }

  get configured(): boolean {
    return Boolean(this.settings.host && this.settings.user && this.settings.password);
  }

  onModuleInit(): void {
    // Loud at boot rather than silently swallowing every customer email.
    if (!this.configured) {
      this.logger.warn(
        'SMTP is not configured — set SMTP_HOST, SMTP_USER and SMTP_PASSWORD. ' +
          'Order emails will be skipped until you do.',
      );
    }
  }

  /** Verifies credentials against the server. Used by the admin health check. */
  async verify(): Promise<{ ok: boolean; detail: string }> {
    if (!this.transporter) return { ok: false, detail: 'SMTP is not configured' };
    try {
      await this.transporter.verify();
      return { ok: true, detail: `Connected to ${this.settings.host}:${this.settings.port}` };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
  }

  /** @returns whether the message was accepted, never throwing. */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Skipped "${message.subject}" to ${message.to} — SMTP not configured`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.settings.from,
        to: message.to,
        replyTo: this.settings.replyTo || undefined,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      this.logger.log(`Sent "${message.subject}" to ${message.to}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Could not send "${message.subject}" to ${message.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }
}
