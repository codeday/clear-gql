import Stripe from "stripe";
import { Event } from '@prisma/client';
import { PaymentIntent } from './PaymentIntent';
import { PaymentProvider } from './PaymentProvider';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {apiVersion: "2020-08-27"});

export const stripePaymentProvider: PaymentProvider = {
  async createIntent(itemPrice: number, currency: string, quantity: number, event: Event): Promise<PaymentIntent> {
    const stripePaymentIntent = await stripe.paymentIntents?.create({
        amount: Math.round(itemPrice * 100) * quantity,
        currency: currency.toLowerCase(),
        statement_descriptor: `CodeDay`,
        metadata: { eventId: event.id, region: event.contentfulWebname },
    });

    if (!stripePaymentIntent.client_secret) {
        throw new Error('Error retrieving stripe client secret');
    }

    return {
      id: stripePaymentIntent.id,
      clientData: stripePaymentIntent.client_secret,
    };
  },

  async isIntentPaid(id: string): Promise<boolean> {
    const intent = await stripe.paymentIntents.retrieve(id);
    return intent.status === 'succeeded';
  }
}
