import { Event } from '@prisma/client';
import { PaymentIntent } from './PaymentIntent';

export interface PaymentProvider {
  createIntent(itemPrice: number, quantity: number, event: Event): Promise<PaymentIntent>
  isIntentPaid(id: string): Promise<boolean>
}
