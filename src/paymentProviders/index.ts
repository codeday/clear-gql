export * from './PaymentIntent';
export * from './PaymentProvider';
export * from './stripe';
export * from './razorpay';
import { PaymentProvider } from './PaymentProvider';
import { razorpayPaymentProvider } from './razorpay';
import { stripePaymentProvider } from './stripe';

export function getPaymentProvider(provider: string): PaymentProvider {
  if (provider === 'stripe') return stripePaymentProvider;
  if (provider === 'razorpay') return razorpayPaymentProvider;
  throw new Error(`Provider ${provider} not found.`);
}
