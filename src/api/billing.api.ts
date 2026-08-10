import { requestJson } from './_shared';

export interface PaymentMethod {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface InvoiceHistory {
  id: string;
  date: string;
  amount: number;
  status: string;
  invoicePdf: string;
}

export interface BillingPortalData {
  isMock: boolean;
  nextPaymentDate: string;
  paymentMethod: PaymentMethod | null;
  history: InvoiceHistory[];
}

function unwrapBillingInfo(value: unknown): BillingPortalData {
  if (value && typeof value === 'object' && 'data' in value) {
    return ((value as { data?: BillingPortalData }).data ?? value) as BillingPortalData;
  }
  return value as BillingPortalData;
}

export const billingApi = {
  getBillingInfo: async (tenantId: string) => unwrapBillingInfo(await requestJson<unknown>(`/stripe/billing-info/${tenantId}`)),
};
