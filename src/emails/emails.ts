import {PrismaClient} from '@prisma/client';
import {mintWaiverLink} from "./waiver";
import {Message, ServerClient} from "postmark"
import config from "../config";
import {marked} from "marked";
import {Twilio} from "twilio";
import ms from 'ms';
import * as handlebars from "handlebars";
import {DateTime} from 'luxon';
import {EmailTemplate, Event, Person, Ticket, Venue} from "../generated/typegraphql-prisma";

const prisma = new PrismaClient()
const postmark = new ServerClient(config.postmark.serverToken || '');
const twilio = new Twilio(config.twilio.sid, config.twilio.token);
const emailQueue: Message[] | { To: string; ReplyTo: string; From: string; HtmlBody: string; Subject: string; MessageStream: string; }[] = []

interface TemplateData {
    ticket: Ticket,
    event: Event,
    venue: Venue | null,
    guardian: Person | null,
    waiverLink: string
}
function IsWorkHours(tz: string | null, fallback='America/Los_Angeles'): Boolean {
    let now = DateTime.local().setZone(tz || undefined)
    if (!now.isValid) {
        now = DateTime.local().setZone(fallback)
        if (!now.isValid) {
            return true
        }
    }
    return now.hour >= 9 && now.hour < 17
}

function IsAfterEvent(event: Event): boolean {
    return new Date() > event.endDate
}

function WouldSendLate(event: Event, ticket: Ticket, template: EmailTemplate) {
    if (template.whenFrom != "EVENTSTART") return false
    // @ts-ignore
    return ticket.createdAt > new Date(event.startDate - ms(template.when))
}

async function ProcessTicket(template: EmailTemplate,
                             ticket: Ticket,
                             smsBodyTemplate: Handlebars.TemplateDelegate,
                             emailSubjectTemplate: Handlebars.TemplateDelegate,
                             emailBodyTemplate: Handlebars.TemplateDelegate,
): Promise<void> {
    const event = await prisma.event.findUnique({where: {id: ticket.eventId}})
    if (!event) return
    const venue = event.venueId? await prisma.venue.findUnique({where: {id: event.venueId || undefined}}) : null
    const guardian = ticket.personId? await prisma.person.findUnique({where: {id: ticket.personId || undefined}}) : null
    const data: TemplateData = {
        ticket,
        event,
        venue,
        guardian,
        waiverLink: mintWaiverLink(ticket)
    }
    if(template.sendInWorkHours && !IsWorkHours(event.timezone)) return
    if(!template.sendAfterEvent && IsAfterEvent(event)) return
    if(!template.sendLate && WouldSendLate(event, ticket, template)) return

    if(template.sendParent) {
        if(!guardian) return
        if(template.sendText && guardian.phone) {
            await SendText(guardian.phone, smsBodyTemplate, data)
        } else if(guardian.email) {
            await QueueEmail(guardian.email, template, emailSubjectTemplate, emailBodyTemplate, data)
        }
    } else {
        if(template.sendText && ticket.phone) {
            await SendText(ticket.phone, smsBodyTemplate, data)
        } else if(ticket.email) {
            await QueueEmail(ticket.email, template, emailSubjectTemplate, emailBodyTemplate, data)
        }
    }
    await prisma.ticket.update({where: {id: ticket.id}, data: {sentEmails: {connect: {id: template.id}}}})
}

async function ProcessTemplate(template: EmailTemplate): Promise<void> {
    const extrafilters = []
    const offset = ms(template.when)
    const emailSubjectTemplate = handlebars.compile(template.subject)
    const emailBodyTemplate = handlebars.compile(template.template)
    const smsBodyTemplate = handlebars.compile(template.textMsg || '')
    switch(template.whenFrom) {
        case "REGISTER":
            extrafilters.push({
                createdAt: {
                    lte: new Date(Date.now() - offset)
                }
            })
            break
        case "EVENTEND":
            extrafilters.push({
                event: {
                    endDate: {
                        lte: new Date(Date.now() - offset)
                    }
                }}
            )
            break
        case "EVENTSTART":
            extrafilters.push({
                event: {
                    startDate: {
                        lte: new Date(Date.now() - offset)
                    }
                }
            })
    }
    const tickets = await prisma.ticket.findMany({
        where: {
            AND: [
                {
                    type: template.sendTo,
                    createdAt: {
                        gte: template.createdAt
                    },
                    sentEmails: {
                        none: {
                            id: template.id
                        }
                    }
                },
                ...extrafilters
            ]
        },
    })
    await Promise.all(tickets.map(async (ticket) => {
        await ProcessTicket(template, ticket, smsBodyTemplate, emailSubjectTemplate, emailBodyTemplate)
    }))
}


async function QueueEmail(sendTo: string,
                    template: EmailTemplate,
                    emailSubjectTemplate: Handlebars.TemplateDelegate,
                    emailBodyTemplate: Handlebars.TemplateDelegate,
                    data: TemplateData,

): Promise<void> {
    emailQueue.push({
            To: sendTo,
            ReplyTo: template.replyTo,
            From: `${template.fromName} <${template.fromEmail}>`,
            Subject: emailSubjectTemplate(data),
            HtmlBody: marked.parse(emailBodyTemplate(data)),
            MessageStream: template.marketing? "attendees" : "outbound"
        })
}

async function SendQueuedEmails(): Promise<void> {
    await postmark.sendEmailBatch(emailQueue)
    // https://stackoverflow.com/a/1232046
    emailQueue.splice(0, emailQueue.length)
}

async function SendText(sendTo: string,
                        smsBodyTemplate: Handlebars.TemplateDelegate,
                        data: TemplateData
): Promise<void> {
    await twilio.messages.create({from: config.twilio.number, to: sendTo, body: smsBodyTemplate(data)})
}

export default async function emails() {
    const templates = await prisma.emailTemplate.findMany({
        where: {automatic: true}
    })
    await Promise.all(templates.map(async (template) => {
        await ProcessTemplate(template)
    }))
    await SendQueuedEmails()
}
