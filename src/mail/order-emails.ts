import { OrderEmailKind } from '../common/enums';
import type { MailMessage } from './mail.service';
import {
  INK,
  LINE,
  MUTE,
  SLATE,
  button,
  escape,
  heading,
  label,
  paragraph,
  rule,
  shell,
} from './layout';

/** Why an order email reached its recipient, shown in the footer. */
const FOOT_NOTE = 'You are receiving this because you placed an order with us.';

/**
 * The transactional emails, as pure functions of the data they show.
 * `confirmed` carries the payment thank-you when a delivery charge was paid
 * to get there; `paymentReceived` itself is now sent by hand only, for a
 * customer who needs reassurance before their order is actually confirmed.
 *
 * Written as inline-styled tables rather than anything modern: email clients
 * have no flexbox, no grid, no external stylesheets and — in Outlook's case —
 * a Word rendering engine. Every message also carries a plain-text part,
 * because some clients show that and spam filters expect it.
 *
 * The visual language follows the storefront: white ground, near-black text,
 * uppercase small-caps labels, hairline rules, nothing rounded.
 */

export interface OrderLine {
  name: string;
  size: string | null;
  quantity: number;
  lineTotal: string;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  to: string;
  lines: OrderLine[];
  /** Pre-formatted, because money formatting belongs in one place. */
  dueNow: string;
  dueOnDelivery: string;
  total: string;
  address: string[];
  orderUrl: string;
  /** Only needed by the "placed" email. */
  payment?: {
    instructions: string;
    whatsappNumber: string;
    whatsappLink: string;
    methods: { title: string; rows: { label: string; value: string }[] }[];
  };
  /** Only needed by the "dispatched" email. */
  dispatch?: {
    courier: string;
    trackingNumber: string;
  };
  /** Only needed by the "confirmed" email — folds the payment thank-you in. */
  paymentAcknowledged?: boolean;
}

export function buildOrderEmail(
  kind: OrderEmailKind,
  data: OrderEmailData,
): MailMessage {
  switch (kind) {
    case OrderEmailKind.Placed:
      return placed(data);
    case OrderEmailKind.PaymentReceived:
      return paymentReceived(data);
    case OrderEmailKind.PaymentReminder:
      return paymentReminder(data);
    case OrderEmailKind.Confirmed:
      return confirmed(data);
    case OrderEmailKind.Dispatched:
      return dispatched(data);
    case OrderEmailKind.Delivered:
      return delivered(data);
  }
}

// ── The five messages ───────────────────────────────────────────────────────

function placed(d: OrderEmailData): MailMessage {
  const body = `
    ${heading('Thank you for your order')}
    ${paragraph(
      `We have your order <strong style="color:${INK}">${escape(d.orderNumber)}</strong>. ` +
        `One step remains before we can confirm it.`,
    )}

    ${paymentStepsHtml(d)}

    ${rule()}
    ${itemsTable(d)}
    ${addressBlock(d)}
    ${button(d.orderUrl, 'View your order')}
  `;

  return {
    to: d.to,
    subject: `Order ${d.orderNumber} — please pay the delivery charge`,
    html: shell(body, FOOT_NOTE),
    text: [
      `Thank you for your order.`,
      ``,
      `Order ${d.orderNumber}`,
      ``,
      ...paymentStepsText(d),
      ``,
      ...textItems(d),
      ``,
      `View your order: ${d.orderUrl}`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

function paymentReminder(d: OrderEmailData): MailMessage {
  const body = `
    ${heading('A quick reminder')}
    ${paragraph(
      `We have not yet received the delivery charge for order ` +
        `<strong style="color:${INK}">${escape(d.orderNumber)}</strong>. ` +
        `The moment it is in, we confirm and start preparing your pieces.`,
    )}

    ${paymentStepsHtml(d)}

    ${rule()}
    ${itemsTable(d)}
    ${button(d.orderUrl, 'View your order')}
  `;

  return {
    to: d.to,
    subject: `Reminder — order ${d.orderNumber} is waiting on the delivery charge`,
    html: shell(body, FOOT_NOTE),
    text: [
      `A quick reminder.`,
      ``,
      `We have not yet received the delivery charge for order ${d.orderNumber}. ` +
        `The moment it is in, we confirm and start preparing your pieces.`,
      ``,
      ...paymentStepsText(d),
      ``,
      ...textItems(d),
      ``,
      `View your order: ${d.orderUrl}`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

function paymentReceived(d: OrderEmailData): MailMessage {
  const body = `
    ${heading('We have your payment')}
    ${paragraph(
      `Thank you — the <strong style="color:${INK}">${escape(d.dueNow)}</strong> delivery charge ` +
        `for order <strong style="color:${INK}">${escape(d.orderNumber)}</strong> has been received.`,
    )}
    ${paragraph(`We are preparing your order now and will email again the moment it is confirmed.`)}
    ${rule()}
    ${itemsTable(d)}
    ${button(d.orderUrl, 'View your order')}
  `;

  return {
    to: d.to,
    subject: `Payment received for order ${d.orderNumber}`,
    html: shell(body, FOOT_NOTE),
    text: [
      `We have your payment.`,
      ``,
      `The ${d.dueNow} delivery charge for order ${d.orderNumber} has been received.`,
      `We are preparing your order and will email again once it is confirmed.`,
      ``,
      ...textItems(d),
      ``,
      `View your order: ${d.orderUrl}`,
    ].join('\n'),
  };
}

function confirmed(d: OrderEmailData): MailMessage {
  const paymentThanks = d.paymentAcknowledged
    ? paragraph(
        `We also have your <strong style="color:${INK}">${escape(d.dueNow)}</strong> ` +
          `delivery-charge payment — thank you.`,
      )
    : '';

  const body = `
    ${heading('Your order is confirmed')}
    ${paragraph(
      `Order <strong style="color:${INK}">${escape(d.orderNumber)}</strong> is confirmed and ` +
        `being prepared. We will email you again the moment it leaves us.`,
    )}
    ${paymentThanks}
    ${rule()}
    ${itemsTable(d)}
    ${paragraph(
      `Please have <strong style="color:${INK}">${escape(d.dueOnDelivery)}</strong> ready in cash ` +
        `for the courier when the parcel arrives.`,
    )}
    ${addressBlock(d)}
    ${button(d.orderUrl, 'View your order')}
  `;

  return {
    to: d.to,
    subject: `Order ${d.orderNumber} is confirmed`,
    html: shell(body, FOOT_NOTE),
    text: [
      `Your order is confirmed.`,
      ``,
      `Order ${d.orderNumber} is confirmed and being prepared.`,
      d.paymentAcknowledged
        ? `We also have your ${d.dueNow} delivery-charge payment — thank you.`
        : '',
      ``,
      ...textItems(d),
      ``,
      `Please have ${d.dueOnDelivery} ready in cash for the courier.`,
      ``,
      ...textAddress(d),
      ``,
      `View your order: ${d.orderUrl}`,
    ]
      .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
      .join('\n'),
  };
}

function dispatched(d: OrderEmailData): MailMessage {
  const courier = d.dispatch?.courier?.trim();
  const tracking = d.dispatch?.trackingNumber?.trim();

  const dispatchRows = [
    courier ? { label: 'Courier', value: courier } : null,
    tracking ? { label: 'Tracking number', value: tracking } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  const body = `
    ${heading('Your order is on its way')}
    ${paragraph(
      `Order <strong style="color:${INK}">${escape(d.orderNumber)}</strong> has been dispatched.`,
    )}

    ${
      dispatchRows.length
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="border:1px solid ${LINE};margin:0 0 20px 0;">
             <tr><td style="padding:16px 20px;">
               ${dispatchRows
                 .map(
                   (row) => `
                 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;">
                   <tr>
                     <td style="font-size:13px;color:${MUTE};">${escape(row.label)}</td>
                     <td align="right" style="font-size:14px;color:${INK};">${escape(row.value)}</td>
                   </tr>
                 </table>`,
                 )
                 .join('')}
             </td></tr>
           </table>`
        : ''
    }

    ${paragraph(
      `Please have <strong style="color:${INK}">${escape(d.dueOnDelivery)}</strong> ready in cash ` +
        `for the courier. The delivery charge is already paid.`,
    )}
    ${rule()}
    ${itemsTable(d)}
    ${addressBlock(d)}
    ${button(d.orderUrl, 'View your order')}
  `;

  return {
    to: d.to,
    subject: `Order ${d.orderNumber} has been dispatched`,
    html: shell(body, FOOT_NOTE),
    text: [
      `Your order is on its way.`,
      ``,
      `Order ${d.orderNumber} has been dispatched.`,
      courier ? `Courier: ${courier}` : '',
      tracking ? `Tracking number: ${tracking}` : '',
      ``,
      `Please have ${d.dueOnDelivery} ready in cash for the courier. The delivery charge is already paid.`,
      ``,
      ...textItems(d),
      ``,
      ...textAddress(d),
      ``,
      `View your order: ${d.orderUrl}`,
    ]
      .filter((line) => line !== '')
      .join('\n'),
  };
}

function delivered(d: OrderEmailData): MailMessage {
  const body = `
    ${heading('Your order has arrived')}
    ${paragraph(
      `Order <strong style="color:${INK}">${escape(d.orderNumber)}</strong> has been delivered. ` +
        `We hope it was worth the wait.`,
    )}
    ${rule()}
    ${itemsTable(d)}
    ${button(d.orderUrl, 'View your order')}
  `;

  return {
    to: d.to,
    subject: `Order ${d.orderNumber} has been delivered`,
    html: shell(body, FOOT_NOTE),
    text: [
      `Your order has arrived.`,
      ``,
      `Order ${d.orderNumber} has been delivered. We hope it was worth the wait.`,
      ``,
      ...textItems(d),
      ``,
      `View your order: ${d.orderUrl}`,
    ].join('\n'),
  };
}

// ── Shared pieces ───────────────────────────────────────────────────────────

/** The "pay the delivery charge" instructions — identical whether this is the
 *  first ask (`placed`) or a nudge that it is still outstanding (`paymentReminder`). */
function paymentStepsHtml(d: OrderEmailData): string {
  const accounts = (d.payment?.methods ?? [])
    .map(
      (method) => `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="border:1px solid ${LINE};margin:0 0 12px 0;">
          <tr><td style="padding:16px 20px;">
            ${label(method.title)}
            ${method.rows
              .filter((row) => row.value)
              .map(
                (row) => `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                <tr>
                  <td style="font-size:13px;color:${MUTE};">${escape(row.label)}</td>
                  <td align="right" style="font-size:14px;color:${INK};">${escape(row.value)}</td>
                </tr>
              </table>`,
              )
              .join('')}
          </td></tr>
        </table>`,
    )
    .join('');

  return `
    ${rule()}
    ${label('Step one — pay the delivery charge')}
    ${paragraph(
      `Transfer <strong style="color:${INK}">${escape(d.dueNow)}</strong> to any account below. ` +
        `The garments themselves are paid for in cash when they arrive.`,
    )}
    ${d.payment?.instructions ? paragraph(escape(d.payment.instructions)) : ''}
    ${accounts || paragraph('Payment details are being updated — please contact us to settle the delivery charge.')}

    ${
      d.payment?.whatsappLink
        ? `
      ${rule()}
      ${label('Step two — send us the screenshot')}
      ${paragraph(
        `Send your payment screenshot to <strong style="color:${INK}">${escape(
          d.payment.whatsappNumber,
        )}</strong> on WhatsApp, quoting ${escape(d.orderNumber)}. ` +
          `We confirm and dispatch as soon as we see it.`,
      )}
      ${button(d.payment.whatsappLink, 'Send proof on WhatsApp')}`
        : ''
    }`;
}

function paymentStepsText(d: OrderEmailData): string[] {
  return [
    `STEP ONE — PAY THE DELIVERY CHARGE`,
    `Transfer ${d.dueNow} to any account below. The garments are paid for in cash on arrival.`,
    d.payment?.instructions ?? '',
    ...(d.payment?.methods ?? []).map(
      (m) =>
        `\n${m.title}\n` +
        m.rows
          .filter((r) => r.value)
          .map((r) => `  ${r.label}: ${r.value}`)
          .join('\n'),
    ),
    ``,
    d.payment?.whatsappNumber
      ? `STEP TWO — Send the screenshot to ${d.payment.whatsappNumber} on WhatsApp, quoting ${d.orderNumber}.`
      : '',
  ];
}

function itemsTable(d: OrderEmailData): string {
  const rows = d.lines
    .map(
      (line) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${SLATE};">
        ${escape(line.name)}${line.size ? `<span style="color:${MUTE};"> · ${escape(line.size)}</span>` : ''}
        <span style="color:${MUTE};"> × ${line.quantity}</span>
      </td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK};white-space:nowrap;">
        ${escape(line.lineTotal)}
      </td>
    </tr>`,
    )
    .join('');

  return `
    ${label('In this order')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
      ${rows}
      <tr>
        <td style="padding:12px 0 0 0;font-size:13px;color:${MUTE};">Garments — on delivery</td>
        <td align="right" style="padding:12px 0 0 0;font-size:14px;color:${INK};">${escape(d.dueOnDelivery)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0 0 0;font-size:13px;color:${MUTE};">Delivery charge</td>
        <td align="right" style="padding:4px 0 0 0;font-size:14px;color:${INK};">${escape(d.dueNow)}</td>
      </tr>
    </table>`;
}

function addressBlock(d: OrderEmailData): string {
  if (d.address.length === 0) return '';
  // Extra top margin: this usually follows the totals, and without it the
  // address crowds the last figure.
  return `
    <div style="margin-top:20px;">${label('Delivering to')}</div>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:${SLATE};">
      ${d.address.map(escape).join('<br>')}
    </p>`;
}

function textItems(d: OrderEmailData): string[] {
  return [
    'IN THIS ORDER',
    ...d.lines.map(
      (l) =>
        `  ${l.name}${l.size ? ` · ${l.size}` : ''} × ${l.quantity}   ${l.lineTotal}`,
    ),
    `  Garments — on delivery: ${d.dueOnDelivery}`,
    `  Delivery charge: ${d.dueNow}`,
  ];
}

function textAddress(d: OrderEmailData): string[] {
  return d.address.length
    ? ['DELIVERING TO', ...d.address.map((line) => `  ${line}`)]
    : [];
}
