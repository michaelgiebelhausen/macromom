// RevenueCat wrapper (TASK-053/054, PRD § Payment Integration).
// All calls are guarded: with no key configured (dev without IAP) the app runs
// fine and the paywall shows a friendly "not available yet" state.

import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
} from 'react-native-purchases';

import { env } from '@/lib/env';

let configured = false;

export function revenuecatConfigured(): boolean {
  return configured;
}

/** Configure once at startup (no-op without a key or on web). */
export function initRevenueCat(): void {
  if (configured || Platform.OS === 'web' || !env.revenuecatIosKey) return;
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey: env.revenuecatIosKey });
  configured = true;
}

/** Map RevenueCat identity to the Supabase user id (TASK-054). */
export async function linkIdentity(supabaseUserId: string): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logIn(supabaseUserId);
  } catch (err) {
    console.warn('[revenuecat] logIn failed', err);
  }
}

export async function unlinkIdentity(): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // logged-out anonymous user — fine
  }
}

export async function getDefaultOffering(): Promise<PurchasesOffering | null> {
  if (!configured) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

/** True when the RevenueCat SDK says the `pro` entitlement is active. */
export function hasProEntitlement(info: CustomerInfo | null): boolean {
  return !!info?.entitlements.active['pro'];
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  return await Purchases.restorePurchases();
}

export { Purchases };
