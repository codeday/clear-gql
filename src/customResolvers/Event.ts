import {Arg, Args, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root} from "type-graphql";
import {Event, FindManyEventArgs, FindUniqueEventArgs, PromoCode} from "../generated/typegraphql-prisma";
import moment from 'moment'
import {Prisma} from "@prisma/client";
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

    calculatePriceWithPromo(event: Event, promo: PromoCode) {
        if(!event.promoCodes?.includes(promo)) {
            throw 'Event does not contain passed promo code!'
        }
        const activeTicketPrice = this.activeTicketPrice(event)

        if(!activeTicketPrice) {
            throw 'Event does not have an active ticket price! (Most likely registrations are closed)'
        }
        let out;
        if(promo.type === "SUBTRACT") {
            out = parseFloat(activeTicketPrice.toString()) - promo.amount
        } else if (promo.type === "PERCENT") {
            out = parseFloat((parseFloat(activeTicketPrice.toString()) * (1 - (promo.amount / 100))).toFixed(2))
            // I hate this
        }
        if (!out) {
            return activeTicketPrice
        } else if (out <= 0) {
            out = 0
        }
        return out
    }
    @FieldResolver(type => GraphQLJSONObject)
    async checkPromoCode(
        @Root() event: Event,
        @Arg('code') code: String,
    ): Promise<CheckPromoCodeResult> {
        let result: CheckPromoCodeResult;
        const matchingCodes = event.promoCodes?.filter((val) => {
            if(val.uses && val.tickets)
                if(val.uses > val.tickets.length)
                    return false;
            return val.code.toLowerCase() === code.toLowerCase();
        })
        const activeTicketPrice = this.activeTicketPrice(event);
        if (!matchingCodes || !activeTicketPrice) {
            return {
                valid: false,
                displayDiscountAmount: null,
                displayDiscountName: null,
                effectivePrice: activeTicketPrice
            }
        }
        let lowestPromoCodeOutput: CheckPromoCodeResult = {
            valid: false,
            effectivePrice: activeTicketPrice,
            displayDiscountName: null,
            displayDiscountAmount: null,
        };
        matchingCodes.forEach((code) => {
            const effectivePrice = this.calculatePriceWithPromo(event, code)
            // @ts-ignore
            if(effectivePrice < lowestPromoCodeOutput.effectivePrice) {
                lowestPromoCodeOutput = {
                    valid: true,
                    effectivePrice: effectivePrice,
                    displayDiscountAmount: (code.type === 'SUBTRACT'? `$${code.amount} off`: `${code.amount}% off`),
                    displayDiscountName: code.code.toUpperCase()
                }
            }
        })
        return lowestPromoCodeOutput;
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
        const event = await prisma.event.findUnique({where: args.eventWhere})
        if(!event) throw 'Event not found!'
        const activeTicketPrice = this.activeTicketPrice(event)
        if(!activeTicketPrice) throw 'No active ticket price!'
        const paymentIntent = await stripe.paymentIntents?.create({
            amount: activeTicketPrice * 100,
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
