import { requestJson } from './_shared';

export interface TenantPlan {
  id: string;
  name: string;
  description: string;
  price: number | null;
}

export interface TenantResponse {
  id: string;
  name: string;
  planId: string | null;
  plan: TenantPlan | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
}

function unwrapTenant(value: unknown): TenantResponse {
  if (value && typeof value === 'object' && 'data' in value) {
    return ((value as { data?: TenantResponse }).data ?? value) as TenantResponse;
  }
  return value as TenantResponse;
}

export const tenantApi = {
  getTenant: async (id: string) => unwrapTenant(await requestJson<unknown>(`/tenants/${id}`)),
};
