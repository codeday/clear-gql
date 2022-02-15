import { Event } from '@prisma/client';
import Razorpay from 'razorpay';
import { PaymentIntent } from './PaymentIntent';
import { PaymentProvider } from './PaymentProvider';

const razorpay =  new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_SECRET });

export const razorpayPaymentProvider: PaymentProvider = {
  async createIntent(itemPrice: number, quantity: number, event: Event): Promise<PaymentIntent> {
    const intent = await razorpay.orders.create({
      amount: Math.round(itemPrice * 100) * quantity,
      currency: 'INR',
      notes: { eventId: event.id, region: event.contentfulWebname },
    });
    return {
      id: intent.id,
      clientData: intent.id,
    };
  },

  async isIntentPaid(id: string): Promise<boolean> {
    const intent = await razorpay.orders.fetch(id);
    return intent.status === 'paid';
  }
}
