import { env } from '../config/env';
import { PaymentMethod } from '../types';

/**
 * Payment abstraction. The MVP intentionally does NOT hold customer funds —
 * see docs/ARCHITECTURE.md section 7 for why. `ManualPaymentDriver` covers
 * cash-on-delivery and staff-confirmed manual payments, which is enough to
 * run the marketplace end-to-end without a money-transmission licence.
 *
 * ── TO ADD MTN MOBILE MONEY / AIRTEL MONEY / CARDS ──
 * Implement `PaymentDriver` against that provider's collection API, set
 * `PAYMENT_DRIVER` in .env, and register it in `getPaymentDriver()`. The
 * `payments` and `transactions` tables and every route that reads payment
 * status are already provider-agnostic.
 */
export interface InitiatePaymentInput {
  orderId: string;
  payerId: string;
  amountUgx: number;
  method: PaymentMethod;
}

export interface PaymentResult {
  status: 'pending' | 'authorized' | 'paid' | 'failed';
  provider: string;
  providerRef: string | null;
}

export interface PaymentDriver {
  initiate(input: InitiatePaymentInput): Promise<PaymentResult>;
  confirmManually(paymentId: string): Promise<PaymentResult>;
}

class ManualPaymentDriver implements PaymentDriver {
  async initiate(input: InitiatePaymentInput): Promise<PaymentResult> {
    // Cash-on-delivery and manual bank/mobile-money-outside-the-app payments
    // start "pending" and are marked paid by an admin/the customer confirming
    // receipt — see paymentController.confirm.
    return {
      status: input.method === 'cash_on_delivery' ? 'pending' : 'pending',
      provider: 'manual',
      providerRef: null,
    };
  }

  async confirmManually(): Promise<PaymentResult> {
    return { status: 'paid', provider: 'manual', providerRef: null };
  }
}

function getPaymentDriver(): PaymentDriver {
  switch (env.paymentDriver) {
    case 'manual':
    default:
      return new ManualPaymentDriver();
    // case 'mtn_momo': return new MtnMomoDriver();       // requires MTN collections API credentials
    // case 'airtel_money': return new AirtelMoneyDriver(); // requires Airtel merchant credentials
  }
}

export const paymentService = getPaymentDriver();
