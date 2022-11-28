import {Arg, Args, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root} from "type-graphql";
import {Event, FindManyEventArgs, FindUniqueEventArgs, PersonCreateInput, PromoCode, TicketCreateWithoutEventInput, EventWhereUniqueInput} from "../generated/typegraphql-prisma";
import moment from 'moment'
import emailValidator from 'email-validator';
import {phone} from 'phone';
import fetch from 'node-fetch';
import {Prisma, PrismaClient, Ticket, TicketType} from "@prisma/client";
import dot from "dot-object";
import {AuthRole, Context} from "../context";
import { mergePdfs, roundDecimal, streamToBuffer } from '../utils';
import {GraphQLJSONObject} from "graphql-scalars";
import { postmark, twilio } from '../services';
import {marked} from "marked";
import * as handlebars from "handlebars";
import { sendWaiverReminder } from '../waivers';
import {PaymentProvider, RegisterForEventArgs} from "../args/RegisterForEventArgs";
import { getPaymentProvider, PaymentIntent } from '../paymentProviders';
import { uploader } from "../services";
import { sendTicketWebhook } from "../webhooks";
import config from '../config';
import { Message } from "postmark";
import { RequestScholarshipArgs, ScholarshipReason } from '../args/RequestScholarshipArgs';
import { ticketEnhanceConfig } from '../customResolversEnhanceMap/Ticket';
import { PublicPerson, Team } from '../types';
import gravatar from 'gravatar';

const SCHOLARSHIP_REASON_DISPOSITION: Record<ScholarshipReason, boolean | string> = {
  [ScholarshipReason.CANT_AFFORD]: true,
  [ScholarshipReason.FAMILY_CANT_AFFORD]: true,
  [ScholarshipReason.FAMILY_UNSURE]: "we have a limited number of scholarship tickets and can't offer them unless you confirm you can't afford it.",
  [ScholarshipReason.DONT_BELIEVE_PAY]: "we're a small nonprofit and don't have the budget to offer everyone free tickets.",
  [ScholarshipReason.OTHER]: false,
};

type GetPaymentInfoQueryResponse = { data: { cms: { regions: { items: { paymentProvider: string | null, currency: string | null }[] } } } };
const GET_PAYMENT_INFO_QUERY = `
query GetPaymentInfoQuery($webname: String!) {
  cms {
    regions(where:{webname:$webname}, limit:1) {
      items {
        paymentProvider
        currency
      }
    }
  }
}
`;

export const MAJORITY_AGE = 18;
export const MIN_AGE = 12;
export const MAX_AGE = 25;

interface CheckPromoCodeResult {
    valid: boolean;
    displayDiscountName: string | null | undefined;
    displayDiscountAmount: string | null | undefined;
    effectivePrice: number | null | undefined;
    remainingUses: number | null | undefined;
    metadata: Prisma.JsonValue | null | undefined;
}

@Resolver(of => Event)
export class CustomEventResolver {
    @FieldResolver(type => String)
    displayDate(
        @Root() event: Event,
    ): String {
        const startDate = moment(event.startDate).utc()
        const endDate = moment(event.endDate).utc()
        if (startDate.dayOfYear() === endDate.dayOfYear()) {
          return `${startDate.format(`MMM Do YYYY`)}`;
        }

        if (startDate.month() === endDate.month()) {
            return `${startDate.format('MMM Do')}-${endDate.format('Do YYYY')}`
        } else {
            return `${startDate.format('MMM Do')}-${endDate.format('MMM Do YYYY')}`
        }
    }


    @FieldResolver(type => String)
    displayTime(
        @Root() event: Event,
    ): String {
        // TODO
        const startDate = moment(event.startDate).utc()
        const endDate = moment(event.endDate).utc()
        if (startDate.dayOfYear() === endDate.dayOfYear()) {
          return `noon`;
        }

        return 'noon-noon';
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
        return event.minAge || MIN_AGE;
    }

    @FieldResolver(type => Number)
    maxAge(
        @Root() event: Event,
    ): number {
        return event.maxAge || MAX_AGE;
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
    @FieldResolver(_returns => String)
    async waiverBook(
      @Root() event: Event,
      @Ctx() { prisma }: Context,
    ): Promise<string> {
      const allProfiles = await prisma.ticket.findMany({
        where: { eventId: event.id, waiverPdfUrl: { not: null } },
        select: { waiverPdfUrl: true }
      });

      const allPages = await Promise.all(allProfiles.map(async (p) => {
        return await streamToBuffer((await fetch(p.waiverPdfUrl!)).body);
      }));

      const merged = await mergePdfs(allPages);
      const { url } = await uploader.file(merged, 'file.pdf');
      return url;
    }


    @FieldResolver(_returns => Team)
    async team(
      @Root() event: Event,
      @Ctx() { prisma }: Context,
    ): Promise<Team> {
      const [ticketStaff, mentors, judges] = await Promise.all(
        [TicketType.STAFF, TicketType.MENTOR, TicketType.JUDGE].map(type => prisma.ticket.findMany({
          where: { type, eventId: event.id },
          select: { firstName: true, lastName: true, email: true, username: true }
        })),
      );

      const ticketStaffUsernames = ticketStaff.map((s) => s.username);
      const managerStaff: PublicPerson[] = event.managers
        .filter((u) => !ticketStaffUsernames.includes(u))
        .map((u) => ({ firstName: u, lastName: '', avatarUrl: gravatar.url(''), username: u }));

      const gravatarify = ((t: Omit<PublicPerson, 'avatarUrl'> & { email: string | null }): PublicPerson =>
        ({ ...t, avatarUrl: gravatar.url(t.email || '', { s: '512', r: 'pg', d: 'retro' }) }));

      return {
        staff: [...managerStaff, ...ticketStaff.map(gravatarify)],
        mentors: mentors.map(gravatarify),
        judges: judges.map(gravatarify),
      };
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
      else return Math.floor(remaining / 5) * 5;
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
        if(activeTicketPrice === null || typeof activeTicketPrice === 'undefined') {
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
                metadata: {},
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
                metadata: promo.metadata,
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
        if (!ticket.email && !ticket.phone && !ticket.whatsApp) errors.push('Email or phone is required.');
        if (ticket.email && !emailValidator.validate(ticket.email)) {
            errors.push(`${ticket.email} is not a valid email.`)
        }
        if (ticket.phone && !phone(ticket.phone).isValid) {
            errors.push(`${ticket.phone} is not a valid phone number.`);
        }
        if (ticket.whatsApp && !phone(ticket.whatsApp).isValid) {
            errors.push(`${ticket.whatsApp} is not a valid phone number.`);
        }

        return errors;
    }

    validateGuardianData(guardianData: PersonCreateInput): string[] {
        const errors: string[] = [];

        if (!guardianData.firstName || !guardianData.lastName) errors.push('Guardian name is required.');
        if (!guardianData.email && !guardianData.phone && !guardianData.whatsApp) {
            errors.push('Guardian email or phone is required.');
        }
        if (guardianData.email && !emailValidator.validate(guardianData.email)) {
            errors.push(`${guardianData.email} is not a valid email.`);
        }
        if (guardianData.phone && !phone(guardianData.phone).isValid) {
            errors.push(`${guardianData.phone} is not a valid phone number.`);
        }
        if (guardianData.whatsApp && !phone(guardianData.whatsApp).isValid) {
            errors.push(`${guardianData.whatsApp} is not a valid phone number.`);
        }

        return errors;
    }

    @Mutation(_returns => String, { nullable: true }) // returns stripe payment intent secret key
    async registerForEvent(
        @Ctx() { prisma }: Context,
        @Args() { ticketData, ticketsData, guardianData, eventWhere, promoCode, paymentProvider }: RegisterForEventArgs,
        skipPayment = false,
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
        const price = skipPayment ? 0 : this.calculatePriceWithPromo(event, promo);

        if (event.requiresPromoCode && !promo) {
            throw new Error('A code is required to register for this event.');
        }

        let paymentId: string | null = null;
        let intent: PaymentIntent | null = null;
        if (price > 0) {

          const res = await fetch('https://graph.codeday.org/', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query: GET_PAYMENT_INFO_QUERY, variables: { webname: event.contentfulWebname } }),
          });
          const { data: { cms } } = <GetPaymentInfoQueryResponse> await res.json();
          if (paymentProvider !== (cms.regions.items[0].paymentProvider || 'stripe')) {
            throw new Error(`Incorrect payment provider.`);
          }
          const currency = cms.regions.items[0].currency || (paymentProvider === 'razorpay' ? 'inr' : 'usd');

          const providerInstance = getPaymentProvider(paymentProvider);
          intent = await providerInstance.createIntent(price, currency, tickets.length, event);

          const { id: _paymentId } = await prisma.payment.create({
            data: { paymentProvider, stripePaymentIntentId: intent.id },
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

        const dbTickets = await prisma.$transaction(tickets.map((ticket) => {
            const isMinor = ticket.age! < this.majorityAge(event);

            return prisma.ticket.create({
                data: {
                  ...ticket,
                  event: { connect: { id: event.id } },
                  guardian: isMinor && guardianId ? { connect: { id: guardianId } } : undefined,
                  payment: paymentId ? { connect: { id: paymentId } } : undefined,
                  promoCode: promo ? { connect: { id: promo.id } } : undefined,
                },
                include: { event: true, guardian: true },
            });
        }));

        // If no payment is required, the finalizePayment mutation will not be called, so send waivers now.
        if (price === 0) {
          for (const ticket of dbTickets) {
            try {
              await sendWaiverReminder(ticket);
            } catch (ex) { console.error(ex); }
            try {
              await sendTicketWebhook(ticket);
            } catch (ex) { console.error(ex); }
          }
        }

        return intent?.clientData || null;
    }

    private async requestScholarshipDisposition(
      { scholarshipReason, scholarshipReasonOther, ...request }: RequestScholarshipArgs,
      error: string,
    ): Promise<void> {
      const body = `<p>A scholarship was requested, but could not be automatically processed.</p>`
        + `<p><strong>Scholarship Reason:</strong> ${scholarshipReason} ${scholarshipReasonOther}</p>`
        + `<p><strong>Error:</strong></p>`
        + `<p><pre>${error}</pre></p>`
        + `<p><strong>Request:</strong></p>`
        + `<p><pre>${JSON.stringify(request, null, 2)}</pre></p>`;

      await postmark.sendEmail({
        To: '"CodeDay" <team@codeday.org>',
        From: '"CodeDay" <no-reply@codeday.org>',
        Subject: 'Scholarship Request',
        HtmlBody: body,
      });
    }

    private async sendStudentTicketMessage(ticket: TicketCreateWithoutEventInput, phoneBody: string, emailSubject: string, emailBody: string) {
      if (ticket.whatsApp) {
        await twilio.messages.create({
          to: `whatsapp:${ticket.whatsApp}`,
          body: phoneBody,
          messagingServiceSid: config.twilio.service,
        });
      } else if (ticket.phone) {
        await twilio.messages.create({
          to: ticket.phone,
          body: phoneBody,
          messagingServiceSid: config.twilio.service,
        });
      }
      if (ticket.email) {
        await postmark.sendEmail({
          To: ticket.email,
          From: '"CodeDay" <team@codeday.org>',
          Subject: emailSubject,
          TextBody: emailBody,
        });
      }
    }

    @Mutation(_returns => Boolean) // returns stripe payment intent secret key
    async requestEventScholarship(
        @Ctx() ctx: Context,
        @Args() args: RequestScholarshipArgs,
    ) : Promise<boolean> {
      const { ticketData, ticketsData, guardianData, eventWhere, scholarshipReason, scholarshipReasonOther } = args;
      const tickets = ticketsData ? ticketsData : [ticketData];

      if (
        !(scholarshipReason in SCHOLARSHIP_REASON_DISPOSITION)
        || SCHOLARSHIP_REASON_DISPOSITION[scholarshipReason] === false
      ) { // We can't handle this automatically, so forward it to the team.
        await this.requestScholarshipDisposition(args, `Could not automatically handle this scholarship type.`);
        return true;
      }

      if (typeof SCHOLARSHIP_REASON_DISPOSITION[scholarshipReason] === 'string') { // We have a rejection reason.
        setTimeout(async () => {
          for (const t of tickets) {
            const msg = `Unfortunately we aren't able to offer you a CodeDay scholarship because ${SCHOLARSHIP_REASON_DISPOSITION[scholarshipReason]}`;
            await this.sendStudentTicketMessage(t, msg, 'CodeDay Scholarship Request', msg);
          }
        }, 1000 * 60 * 30 * (Math.random() + 1)); // Respond with rejection after a delay of 30-60min.
        return true;
      }

      // 
      // =====
      // 
      // We can automatically issue a ticket!

      setTimeout(async () => {
        try {
          this.registerForEvent(ctx, { ...args, promoCode: undefined, paymentProvider: PaymentProvider.stripe }, true);
          try {
            for (const t of tickets) {
              const msg = `We approved your CodeDay scholarship request. Your ticket information will be sent separately.`;
              await this.sendStudentTicketMessage(t, msg, 'CodeDay Scholarship Request', msg);
            }
          } catch (ex) {}
        } catch (ex) {
          await this.requestScholarshipDisposition(args, (ex as Error).toString());
        }
      }, 1000 * 60 * 5 * (Math.random() + 1)); // Accept after 5-10 minutes.
      return true;
    }


    @Mutation(_returns => [String])
    async finalizePayment(
        @Ctx() { prisma }: Context,
        @Arg('paymentIntentId', () => String) paymentIntentId: string,
        @Arg('paymentProvider', () => PaymentProvider, { defaultValue: PaymentProvider.stripe }) paymentProvider: PaymentProvider,
    ): Promise<string[]> {
        if (!(await getPaymentProvider(paymentProvider).isIntentPaid(paymentIntentId))) {
          throw new Error(`Payment has not yet completed. Please contact support.`);
        }

        await prisma.payment.updateMany({
            where: { stripePaymentIntentId: paymentIntentId },
            data: { complete: true },
        });

        const tickets = await prisma.ticket.findMany({
            where: { payment: { stripePaymentIntentId: paymentIntentId } },
            include: { event: true, guardian: true },
        });

        // For paid tickets, waivers are not sent initially, so we send them now:
        for (const ticket of tickets) {
          try {
            await sendWaiverReminder(ticket);
          } catch (ex) { console.error(ex); }
          try {
            await sendTicketWebhook(ticket);
          } catch (ex) { console.error(ex); }
        }

        return tickets.map(ticket => ticket.id);
    }

    @Mutation(_returns => Boolean)
    async withdrawFailedPayment(
        @Ctx() { prisma }: Context,
        @Arg('paymentIntentId', () => String) paymentIntentId: string,
        @Arg('paymentProvider', () => PaymentProvider, { defaultValue: PaymentProvider.stripe }) paymentProvider: PaymentProvider,
    ): Promise<Boolean> {
        if (await getPaymentProvider(paymentProvider).isIntentPaid(paymentIntentId)) {
          throw new Error(`Payment was partially processed. Please contact support to resolve issues.`);
        }

        await prisma.ticket.deleteMany({
          where: { payment: { stripePaymentIntentId: paymentIntentId } },
        });

        return true;
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => Boolean)
    async sendNotification(
        @Ctx() { prisma }: Context,
        @Arg('eventWhere', () => EventWhereUniqueInput) eventWhere: EventWhereUniqueInput,
        @Arg('guardian', () => Boolean, { defaultValue: false }) guardian: boolean,
        @Arg('emailSubject', () => String, { nullable: true }) emailSubject?: string,
        @Arg('emailBody', () => String, { nullable: true }) emailBody?: string,
        @Arg('smsBody', () => String, { nullable: true }) smsBody?: string,
    ): Promise<Boolean> {
        const [event, tickets] = await Promise.all([
            prisma.event.findUnique({
                rejectOnNotFound: true,
                where: eventWhere,
                include: { venue: true },
            }),
            prisma.ticket.findMany({
              where: {
                event: eventWhere,
                OR: [{ payment: { complete: true } }, { payment: null }],
              },
              include: { guardian: true },
            }),
        ]);

        const emailSubjectTemplate = emailSubject && handlebars.compile(emailSubject);
        const emailBodyTemplate = emailBody && handlebars.compile(emailBody);
        const smsBodyTemplate = smsBody && handlebars.compile(smsBody);

        (async () => {
          const emailQueue: Message[] = [];
          for (const ticket of tickets) {
            try {
              const to = guardian ? ticket.guardian : ticket;
              if (!to) continue;
              const data = { event, ticket, to };

              if (emailSubjectTemplate && emailBodyTemplate && to.email) {
                emailQueue.push({
                  To: to.email,
                  ReplyTo: `team@codeday.org`,
                  From: `CodeDay <team@codeday.org>`,
                  Subject: emailSubjectTemplate(data),
                  HtmlBody: marked.parse(emailBodyTemplate(data)),
                  MessageStream: "outbound"
                })
              }
              if (smsBodyTemplate && to.phone) {
                await twilio.messages.create({
                  to: to.phone,
                  body: smsBodyTemplate(data),
                  messagingServiceSid: config.twilio.service,
                });
              }
              if (smsBodyTemplate && to.whatsApp) {
                await twilio.messages.create({
                  to: to.whatsApp,
                  body: smsBodyTemplate(data),
                  messagingServiceSid: config.twilio.service,
                });
              }
            } catch (ex) { console.error(ex); }
          }

          try { await postmark.sendEmailBatch(emailQueue); } catch (ex) { console.error(ex); }
        })();

        return true;
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => Boolean)
    async sendInterestedEmail(
        @Ctx() { prisma }: Context,
        @Arg('eventWhere', () => EventWhereUniqueInput) eventWhere: EventWhereUniqueInput,
        @Arg('subject', () => String, { nullable: true }) subject?: string,
        @Arg('body', () => String, { nullable: true }) body?: string,
    ): Promise<Boolean> {
        const [event, tickets] = await Promise.all([
            prisma.event.findUnique({
                rejectOnNotFound: true,
                where: eventWhere,
                include: { venue: true },
            }),
            prisma.ticket.findMany({
              where: {
                event: eventWhere,
                OR: [{ payment: { complete: true } }, { payment: null }],
              },
              select: { email: true, guardian: { select: { email: true } } },
            }),
        ]);

        const alreadyRegisteredEmails: string[] = tickets.flatMap((e) => [e.email, e.guardian?.email]).filter(Boolean) as string[];


        const interestedNotRegistered = await prisma.mailingListMember.findMany({
          where: {
            interestedInEvents: { some: eventWhere },
            email: { notIn: alreadyRegisteredEmails },
          },
          select: { email: true },
        });

        const subjectCompiled = handlebars.compile(subject)({ event });
        const bodyCompiled = marked.parse(handlebars.compile(body)({ event }));

        const emailQueue: Message[] = [];
        for (const to of interestedNotRegistered) {
          emailQueue.push({
            To: to.email,
            ReplyTo: `team@codeday.org`,
            From: `CodeDay <team@codeday.org>`,
            Subject: subjectCompiled,
            HtmlBody: bodyCompiled,
            MessageStream: "outbound"
          });
        }

        await postmark.sendEmailBatch(emailQueue);
        return true;
    }

    @Mutation(_returns => Boolean)
    async applyForWorkshop(
        @Ctx() { prisma }: Context,
        @Arg('eventWhere', () => EventWhereUniqueInput) eventWhere: EventWhereUniqueInput,
        @Arg('firstName', () => String) firstName: string,
        @Arg('lastName', () => String) lastName: string,
        @Arg('email', () => String) email: string,
        @Arg('description', () => String) description: string,
        @Arg('bio', () => String) bio: string,
    ): Promise<Boolean> {
        const event = await prisma.event.findUnique({
          rejectOnNotFound: true,
          where: eventWhere,
        });

        await postmark.sendEmail({
          To: event.managers.map(m => `${m}@codeday.org`).join(`, `),
          Cc: 'CodeDay Volunteers <volunteer@codeday.org>',
          ReplyTo: email,
          From: `CodeDay <team@codeday.org>`,
          Subject: `Workshop slot application from ${firstName} ${lastName}`,
          TextBody: `Event: ${event.name}\nName: ${firstName} ${lastName}\nEmail: ${email}\nBio: ${bio}\nDescription:\n${description}`,
        });
        return true;
    }

}

@Resolver(of => Event)
export class EventMetadataResolver {
    // @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
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
