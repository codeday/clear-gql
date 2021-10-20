import {Arg, Args, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root} from "type-graphql";
import {Event, FindManyEventArgs, FindUniqueEventArgs, PromoCode} from "../generated/typegraphql-prisma";
import moment from 'moment'
import {Prisma, PrismaClient} from "@prisma/client";
import dot from "dot-object";
import {AuthRole, Context} from "../context";
import {GraphQLJSONObject} from "graphql-scalars";
import Stripe from "stripe";
import {RegisterForEventArgs} from "../args/RegisterForEventArgs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {apiVersion: "2020-08-27"});

interface CheckPromoCodeResult {
    valid: boolean;
    displayDiscountName: string | null;
    displayDiscountAmount: string | null;
    effectivePrice: Number | null;
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

    async fetchPromo(prisma: PrismaClient, event: Event, code?: string | null): Promise<PromoCode | null> {
        if (!code) return null;
        const codes = await prisma.promoCode.findMany({
            where: {
              event: { id: event.id },
              code: {
                equals: code.trim(),
                mode: 'insensitive'
              },
            },
            include: { tickets: { select: { id: true } } }
        });
        const match = codes.filter(c => !c.uses || !c.tickets || c.uses > c.tickets.length)[0];
        // TODO(@tylermenezes): If there are multiple promo codes use the best available one.

        if (!match) return null;
        const { tickets, ...rest } = match;
        return rest;
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
            return Math.max(0, activeTicketPrice - promo.amount);
        } else if (promo.type === "PERCENT") {
            return Math.max(0, activeTicketPrice * (1 - (promo.amount / 100)));
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
        if (promo === null || activeTicketPrice === null) {
            return {
                valid: false,
                displayDiscountAmount: null,
                displayDiscountName: null,
                effectivePrice: activeTicketPrice
            }
        } else {
            return {
                valid: true,
                effectivePrice: this.calculatePriceWithPromo(event, promo),
                displayDiscountAmount: promo.type === 'PERCENT' ? promo.amount + '%' : '$' + promo.amount.toFixed(2),
                displayDiscountName: promo.code.toUpperCase(),
            }
        }
    }

    @Mutation(_returns => String) // returns stripe payment intent secret key
    async registerForEvent(
        @Ctx() { prisma }: Context,
        @Args() args: RegisterForEventArgs,
    ) : Promise<String> {

        if(!args.ticketData.age) throw 'Age is required'

        if(args.ticketData.age < 18) {
            if(!args.guardianData) {
                throw 'Guardian details required'
            }
            if (!args.guardianData.phone && !args.guardianData.email) {
                throw 'Either guardian email or phone is required'
            }
        }

        if(!args.ticketData.phone && !args.ticketData.email) {
            throw 'Either email or phone is required'
        }

        const event = await prisma.event.findUnique({
            rejectOnNotFound: true,
            where: args.eventWhere,
        });
        const promo = await this.fetchPromo(prisma, event, args.promoCode);
        const price = this.calculatePriceWithPromo(event, promo);

        const paymentIntent = await stripe.paymentIntents?.create({
            amount: Math.round(price * 100),
            currency: 'usd'
        })

        if (!paymentIntent.client_secret) {
            throw 'Error retrieving stripe client secret'
        }

        await prisma.ticket.create({data: {
                ...args.ticketData,
                event: {
                    connect: {
                        id: event.id
                    }
                },
                guardian: {
                ...(args.guardianData? {create: {...args.guardianData}}: null)
                },
                payment: {
                    create: {
                        stripePaymentIntentId: paymentIntent.id
                   }
                }
            }})
        return paymentIntent.client_secret
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
