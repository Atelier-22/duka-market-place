import { env } from '../config/env';
import { PaymentMethod } from '../types';

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

  }
}

export const paymentService = getPaymentDriver();
