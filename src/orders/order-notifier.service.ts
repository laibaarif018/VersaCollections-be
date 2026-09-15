import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderEmailKind } from '../common/enums';
import { MailService } from '../mail/mail.service';
import { SettingsService } from '../settings/settings.service';
import { buildOrderEmail, type OrderEmailData } from '../mail/order-emails';
import type { OrderDocument } from './schemas/order.schema';

/**
 * Turns an order into the right customer email and records that it went.
 *
 * Kept apart from `OrdersService` so the order lifecycle stays readable: that
 * class decides *what happened*, this one decides *what the customer is told*.
 *
 * Nothing here throws. An email is a courtesy; an order is a commitment. If the
 * mail server is down the status change still stands, the failure is logged,
 * and the admin can resend from the panel.
 */
@Injectable()
export class OrderNotifierService {
  private readonly logger = new Logger(OrderNotifierService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly settingsService: SettingsService,
    private readonly config: ConfigService,
  ) {}

  async notify(order: OrderDocument, kind: OrderEmailKind): Promise<boolean> {
    try {
      const data = await this.compose(order, kind);
      const sent = await this.mailService.send(buildOrderEmail(kind, data));

      if (sent) {
        // Recorded only on success, so a gap in this list is a real gap.
        order.emails.push({ kind, sentAt: new Date(), to: order.email });
        await order.save();
      }
      return sent;
    } catch (error) {
      this.logger.error(
        `Could not send the "${kind}" email for ${order.orderNumber}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  private async compose(
    order: OrderDocument,
    kind: OrderEmailKind,
  ): Promise<OrderEmailData> {
    const currency = order.currency;
    const money = (minorUnits: number) => formatMoney(minorUnits, currency);

    const address = order.shippingAddress;
    const data: OrderEmailData = {
      orderNumber: order.orderNumber,
      customerName: address.fullName,
      to: order.email,
      lines: order.items.map((item) => ({
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        lineTotal: money(item.lineTotal),
      })),
      dueNow: money(order.shipping),
      dueOnDelivery: money(order.subtotal),
      total: money(order.total),
      address: [
        address.fullName,
        address.line1,
        address.line2,
        [address.city, address.region].filter(Boolean).join(', '),
        address.postalCode,
        address.country,
      ].filter((line): line is string => Boolean(line && line.trim())),
      orderUrl: this.orderUrl(order),
    };

    // Only the unpaid-facing emails carry account details — once the charge is
    // in, repeating bank numbers in every message is noise.
    if (
      kind === OrderEmailKind.Placed ||
      kind === OrderEmailKind.PaymentReminder
    ) {
      const payment = await this.settingsService.paymentView();
      const methods: OrderEmailData['payment'] = {
        instructions: payment.paymentInstructions,
        whatsappNumber: payment.whatsappNumber,
        whatsappLink: payment.whatsappE164
          ? `https://wa.me/${payment.whatsappE164}?text=${encodeURIComponent(
              `Hello! I have paid the delivery charge for order ${order.orderNumber}. My payment screenshot is attached.`,
            )}`
          : '',
        methods: [],
      };

      if (payment.easypaisa) {
        methods.methods.push({
          title: 'EasyPaisa',
          rows: [
            { label: 'Account title', value: payment.easypaisa.accountTitle },
            { label: 'Account number', value: payment.easypaisa.number },
          ],
        });
      }
      if (payment.jazzcash) {
        methods.methods.push({
          title: 'JazzCash',
          rows: [
            { label: 'Account title', value: payment.jazzcash.accountTitle },
            { label: 'Account number', value: payment.jazzcash.number },
          ],
        });
      }
      if (payment.bank) {
        methods.methods.push({
          title: payment.bank.bankName || 'Bank transfer',
          rows: [
            { label: 'Account title', value: payment.bank.accountTitle },
            { label: 'Account number', value: payment.bank.accountNumber },
            { label: 'IBAN', value: payment.bank.iban },
          ],
        });
      }

      data.payment = methods;
    }

    if (kind === OrderEmailKind.Dispatched) {
      data.dispatch = {
        courier: order.courier,
        trackingNumber: order.trackingNumber,
      };
    }

    // `updateStatus` refuses to confirm an order with an unpaid delivery
    // charge, so by the time this fires, `deliveryPaid` is only false when
    // there was never a charge to pay in the first place.
    if (kind === OrderEmailKind.Confirmed) {
      data.paymentAcknowledged = order.shipping > 0 && order.deliveryPaid;
    }

    return data;
  }

  /**
   * A guest has no account to sign into, so their link carries the order's
   * access token — the same credential the checkout redirect uses.
   */
  private orderUrl(order: OrderDocument): string {
    const base = this.config.getOrThrow<string>('app.storefrontUrl');
    const path = `${base}/orders/${String(order._id)}`;
    return order.user
      ? path
      : `${path}?t=${encodeURIComponent(order.accessToken)}`;
  }
}

/**
 * Money is integer minor units everywhere in this API; this is the one place
 * the server formats it, because an email cannot call the storefront helper.
 */
function formatMoney(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: minorUnits % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}
