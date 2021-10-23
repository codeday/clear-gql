import {Arg, Args, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root} from "type-graphql";
import {Event, FindManyEventArgs, FindUniqueEventArgs, PersonCreateInput, PromoCode, TicketCreateWithoutEventInput} from "../generated/typegraphql-prisma";
import moment from 'moment'
import emailValidator from 'email-validator';
import {phone} from 'phone';
import {Prisma, PrismaClient, Ticket} from "@prisma/client";
import dot from "dot-object";
import {AuthRole, Context} from "../context";
import { roundDecimal } from '../utils';
import {GraphQLJSONObject} from "graphql-scalars";
import Stripe from "stripe";
import {RegisterForEventArgs} from "../args/RegisterForEventArgs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {apiVersion: "2020-08-27"});

export const MAJORITY_AGE = 18;
export const MIN_AGE = 13;
export const MAX_AGE = 25;

interface CheckPromoCodeResult {
    valid: boolean;
    displayDiscountName: string | null;
    displayDiscountAmount: string | null;
    effectivePrice: number | null;
    remainingUses: number | null;
}

@Resolver(of => Event)
export class CustomEventResolver {
    @FieldResolver(type => String)
    displayDate(
        @Root() event: Event,
    ): String {
        const startDate = moment(event.startDate).utc()
        const endDate = moment(event.endDate).utc()
        if (startDate.month() === endDate.month()) {
            return `${startDate.format('MMM Do')}-${endDate.format('Do YYYY')}`
        } else {
            return `${startDate.format('MMM Do')}-${endDate.format('MMM Do YYYY')}`
        }
    }

    @FieldResolver(type => Number)
    majorityAge(
        @Root() event: Event,
    ): number {
        return MAJORITY_AGE;
    }

    @FieldResolver(type => Number)
    minAge(
        @Root() event: Event,
    ): number {
        return MIN_AGE;
    }

    @FieldResolver(type => Number)
    maxAge(
        @Root() event: Event,
    ): number {
        return MAX_AGE;
    }

    @FieldResolver(type => Boolean)
    canRegister(
        @Root() event: Event,
    ): Boolean {
        const closeDate = moment(event.registrationCutoff).utc()
        const now = moment().utc()
        return closeDate.isSameOrAfter(now) && event.registrationsOpen
    }

    @FieldResolver(type => Boolean)
    canEarlyBirdRegister(
        @Root() event: Event,
    ): Boolean {
        const earlyBirdCloseDate = moment(event.earlyBirdCutoff).utc()
        const now = moment().utc()
        return earlyBirdCloseDate.isSameOrAfter(now) && this.canRegister(event)
    }

    @FieldResolver(type => Number, {nullable: true})
    activeTicketPrice(
        @Root() event: Event,
    ): number | null {
        if (this.canEarlyBirdRegister(event)) return event.earlyBirdPrice
        if (this.canRegister(event)) return event.ticketPrice
        return null
    }

    @Query(_returns => [Event])
    async events(
        @Args() args: FindManyEventArgs,
        @Ctx() {prisma, auth}: Context,
        @Arg('editable', () => Boolean, {nullable: true}) editable?: Boolean,
    ) : Promise<Event[]> {
        if(auth.username && editable) return await prisma.event.findMany({where: {managers: {has: auth.username || null}}})
        return await prisma.event.findMany({...args})
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @FieldResolver(_returns => Number)
    async soldTickets(
      @Root() event: Event,
      @Ctx() { prisma }: Context,
      @Arg('onlyStudents', () => Boolean, { defaultValue: false }) onlyStudents: Boolean,
    ): Promise<number> {
      return prisma.ticket.count({
        where: {
          event: { id: event.id },
          ...(onlyStudents ? { type: 'STUDENT' } : {}),
        },
      });
    }

    @FieldResolver(_returns => Number, { nullable: true })
    async remainingTickets(
      @Root() event: Event,
      @Ctx() { prisma, auth }: Context,
    ): Promise<number | null> {
      if (!event.venueId) return null;
      const [venue, soldTickets] = await Promise.all([
        prisma.venue.findUnique({ where: { id: event.venueId }, select: { capacity: true } }),
        prisma.ticket.count({ where: { eventId: event.id } }),
      ]);

      if (!venue?.capacity) return null;

      const remaining = venue.capacity - soldTickets;

      // Publicly report the approximate capacity if more than 10 tickets remain, so that it's harder for people
      // to gather ticket speed statistics.
      if (remaining <= 10 || auth.isAdmin || auth.isManager || auth.isVolunteer) return remaining;
      else return Math.floor(remaining / 10) * 10;
    }

    async fetchPromo(
        prisma: PrismaClient,
        event: Event,
        code?: string | null,
    ): Promise<PromoCode & { tickets: Ticket[] } | null> {
        if (!code) return null;
        const codes = await prisma.promoCode.findMany({
            where: {
              event: { id: event.id },
              code: {
                equals: code.trim(),
                mode: 'insensitive'
              },
            },
            include: { tickets: true }
        });
        const match = codes.filter(c => !c.uses || !c.tickets || c.uses > c.tickets.length)[0];
        // TODO(@tylermenezes): If there are multiple promo codes use the best available one.

        if (!match) return null;
        return match;
    }

    calculatePriceWithPromo(event: Event, promo?: PromoCode | null) {
        const activeTicketPrice = this.activeTicketPrice(event)
        if(!activeTicketPrice) {
            throw 'Event does not have an active ticket price! (Most likely registrations are closed)'
        }

        if (!promo) return activeTicketPrice;

        if(promo.eventId !== event.id) {
            throw 'Event does not contain this promo code!'
        }

        if(promo.type === "SUBTRACT") {
            return roundDecimal(Math.max(0, activeTicketPrice - promo.amount));
        } else if (promo.type === "PERCENT") {
            return roundDecimal(Math.max(0, activeTicketPrice * (1 - (promo.amount / 100))));
        }

        return 0;
    }

    @FieldResolver(type => GraphQLJSONObject)
    async checkPromoCode(
        @Ctx() { prisma }: Context,
        @Root() event: Event,
        @Arg('code', type => String) code: string,
    ): Promise<CheckPromoCodeResult> {
        let result: CheckPromoCodeResult;
        const activeTicketPrice = this.activeTicketPrice(event);
        const promo = await this.fetchPromo(prisma, event, code);
        if (promo === null || activeTicketPrice === null || promo.uses && promo.uses <= promo.tickets.length) {
            return {
                valid: false,
                displayDiscountAmount: null,
                displayDiscountName: null,
                remainingUses: null,
                effectivePrice: activeTicketPrice,
            }
        } else {
            return {
                valid: true,
                displayDiscountAmount: promo.type === 'PERCENT' ? promo.amount + '%' : '$' + promo.amount.toFixed(2),
                displayDiscountName: promo.code.toUpperCase(),
                remainingUses: promo.uses !== null && typeof promo.uses !== 'undefined'
                  ? promo.uses - promo?.tickets.length
                  : null,
                effectivePrice: this.calculatePriceWithPromo(event, promo),
            }
        }
    }

    validateTicket(event: Event, ticket: TicketCreateWithoutEventInput): string[] {
        const errors: string[] = [];
        const minAge = this.minAge(event);
        const maxAge = this.maxAge(event);

        if (!ticket.age) errors.push(`Age is required`);
        else if (ticket.age < minAge) errors.push(`You must be at least ${minAge} to participate.`);
        else if (ticket.age > maxAge) errors.push(`You must be under ${maxAge} to participate.`);

        if (!ticket.firstName || !ticket.lastName) errors.push('Name is required.');
        if (!ticket.email && !ticket.phone) errors.push('Email or phone is required.');
        if (ticket.email && !emailValidator.validate(ticket.email)) {
            errors.push(`${ticket.email} is not a valid email.`)
        }
        if (ticket.phone && !phone(ticket.phone).isValid) {
            errors.push(`${ticket.phone} is not a valid phone number.`);
        }

        return errors;
    }

    validateGuardianData(guardianData: PersonCreateInput): string[] {
        const errors: string[] = [];

        if (!guardianData.firstName || !guardianData.lastName) errors.push('Guardian name is required.');
        if (!guardianData.email && !guardianData.phone) errors.push('Guardian email or phone is required.');
        if (guardianData.email && !emailValidator.validate(guardianData.email)) {
            errors.push(`${guardianData.email} is not a valid email.`);
        }
        if (guardianData.phone && !phone(guardianData.phone).isValid) {
            errors.push(`${guardianData.phone} is not a valid phone number.`);
        }

        return errors;
    }

    @Mutation(_returns => String, { nullable: true }) // returns stripe payment intent secret key
    async registerForEvent(
        @Ctx() { prisma }: Context,
        @Args() { ticketData, ticketsData, guardianData, eventWhere, promoCode }: RegisterForEventArgs,
    ) : Promise<string | null> {
        if (!ticketData && (!ticketsData || ticketsData.length === 0)) throw new Error('Must provide a ticket.');
        const tickets = ticketsData ?? [ticketData];

        const [{ venue, ...event }, ticketCount] = await Promise.all([
            prisma.event.findUnique({
                rejectOnNotFound: true,
                where: eventWhere,
                include: { venue: { select: { capacity: true } } },
            }),
            prisma.ticket.count({ where: { event: eventWhere } }),
        ]);

        if (!venue?.capacity || !event.registrationsOpen) {
            throw new Error('Registrations for this event are not open.');
        }

        const remainingCapacity = venue.capacity - ticketCount;
        if (remainingCapacity < tickets.length) {
            throw new Error(`Sorry, only ${remainingCapacity} tickets are still available for this event.`);
        }

        // Check if all required information is present on the ticket.
        const ticketsMissingInformation = tickets.map(ticket => this.validateTicket(event, ticket)).flat();
        if (ticketsMissingInformation.length > 0) {
            throw new Error(ticketsMissingInformation.join(' '));
        }

        // If any participants are minors, guardian data is required.
        const ticketContainsMinor = tickets.filter(ticket => ticket.age! < this.majorityAge(event)).length > 0;
        if (ticketContainsMinor && !guardianData) {
            throw new Error('Guardian data is required because a participant is a minor.');
        }

        if (guardianData) {
            const guardianMissingInformation = this.validateGuardianData(guardianData);
            if (guardianMissingInformation.length > 0) {
                throw new Error(guardianMissingInformation.join(' '));
            }
        }

        const promo = await this.fetchPromo(prisma, event, promoCode);
        const price = this.calculatePriceWithPromo(event, promo);

        let paymentIntent: Stripe.Response<Stripe.PaymentIntent> | null = null;
        let paymentId: string | null = null;
        if (price > 0) {
          paymentIntent = await stripe.paymentIntents?.create({
              amount: Math.round(price * 100) * tickets.length,
              currency: 'usd',
              statement_descriptor: 'CodeDay',
          });

          if (!paymentIntent.client_secret) {
              throw new Error('Error retrieving stripe client secret');
          }

          const { id: _paymentId } = await prisma.payment.create({
            data: { stripePaymentIntentId: paymentIntent.id },
            select: { id: true },
          });
          paymentId = _paymentId;
        }

        let guardianId: string | null = null;
        if (guardianData) {
            const { id: _guardianId } = await prisma.person.create({
                data: guardianData,
            });
            guardianId = _guardianId;
        }

        await prisma.$transaction(tickets.map((ticket) => {
            const isMinor = ticket.age! > this.majorityAge(event);

            return prisma.ticket.create({data: {
                ...ticket,
                event: { connect: { id: event.id } },
                guardian: isMinor && guardianId ? { connect: { id: guardianId } } : undefined,
                payment: paymentId ? { connect: { id: paymentId } } : undefined,
                promoCode: promo ? { connect: { id: promo.id } } : undefined,
            }});
        }));

        return paymentIntent?.client_secret || null;
    }

    @Mutation(_returns => [String])
    async finalizePayment(
        @Ctx() { prisma }: Context,
        @Arg('paymentIntentId', () => String) paymentIntentId: string,
    ): Promise<string[]> {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status !== 'succeeded') {
            throw new Error(`Payment status is still ${intent.status}. Please contact support.`);
        }
        await prisma.payment.updateMany({
            where: { stripePaymentIntentId: paymentIntentId },
            data: { complete: true },
        });

        const tickets = await prisma.ticket.findMany({
            where: { payment: { stripePaymentIntentId: paymentIntentId } },
            select: { id: true },
        });

        return tickets.map(ticket => ticket.id);
    }

    @Mutation(_returns => Boolean)
    async withdrawFailedPayment(
        @Ctx() { prisma }: Context,
        @Arg('paymentIntentId', () => String) paymentIntentId: string,
    ): Promise<Boolean> {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status === 'succeeded') {
            throw new Error(`Payment was already processed. Contact support for a refund.`);
        }

        await prisma.ticket.deleteMany({
          where: { payment: { stripePaymentIntentId: paymentIntentId } },
        });

        return true;
    }

}

@Resolver(of => Event)
export class EventMetadataResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @FieldResolver(type => String, {nullable: true})
    getMetadata(
        @Root() event: Event,
        @Arg("key") key: string,

    ): String | null {
        if (!event.metadata) return null;
        const metadataObject = event.metadata as Prisma.JsonObject;
        const value = dot.pick(key, metadataObject)
        if(value) return value.toString()
        return null
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => Event, {nullable: true})
    async setEventMetadata(
        @Args() args: FindUniqueEventArgs,
        @Arg("key") key: string,
        @Arg("value") value: string,
        @Ctx() { prisma }: Context,
    ): Promise<Event | null> {
        const event = await prisma.event.findUnique({
            ...args,
            select: {
                metadata: true
            }
        });
        if (!event) return null;
        const metadataObject = event.metadata as Prisma.JsonObject || {}
        dot.str(key, value, metadataObject)
        return await prisma.event.update({...args, data: {metadata: metadataObject}})
    }
}
