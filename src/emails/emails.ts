import {mintWaiverLink} from "./waiver";
import {Message} from "postmark"
import config from "../config";
import {marked} from "marked";
import ms from 'ms';
import * as handlebars from "handlebars";
import {DateTime} from 'luxon';
import { postmark, prisma, twilio } from '../services';
import {EmailTemplate, Event, Person, Ticket, Venue} from "../generated/typegraphql-prisma";

const emailQueue: Message[] | { To: string; ReplyTo: string; From: string; HtmlBody: string; Subject: string; MessageStream: string; }[] = []


handlebars.registerHelper('date', (date) => {
    return DateTime.fromJSDate(date).setZone('UTC').toLocaleString(DateTime.DATE_FULL)
})

interface TemplateData {
    ticket: Ticket,
    event: Event,
    venue: Venue | null,
    guardian: Person | null,
    waiverLink: string
}

export function previewTemplate(template: string) {
    const exampleData: TemplateData = {
        ticket: {
            id: "ticket_id",
            createdAt: new Date(),
            updatedAt: new Date(),
            type: "STUDENT",
            firstName: "FirstName",
            lastName: "LastName",
            waiverSigned: false,
            eventId: "event_id"
        },
        event: {
            requiresPromoCode: false,
            id: "event_id",
            createdAt: new Date(Date.UTC(2022, 0, 0)),
            updatedAt: new Date(Date.UTC(2022, 0, 0)),
            name: "event_name",
            startDate: new Date(Date.UTC(2022, 1, 1)),
            endDate: new Date(Date.UTC(2022, 1, 2)),
            ticketPrice: 20,
            majorityAge: 18,
            registrationCutoff: new Date(Date.UTC(2022, 1, 1)),
            earlyBirdCutoff: new Date(Date.UTC(2022, 0, 15)),
            earlyBirdPrice: 10,
            registrationsOpen: true,
            managers: [],
            eventGroupId: "eventgroup_id",
        },
        venue: {
            id: "venue_id",
            name: "venue_name",
            createdAt: new Date(Date.UTC(2022, 0, 0)),
            updatedAt: new Date(Date.UTC(2022, 0, 0)),
            address: "123 venue St, Venue, VN, 12345",
        },
        guardian: {
            id: "guardian_id",
            createdAt: new Date(Date.UTC(2022, 0, 0)),
            updatedAt: new Date(Date.UTC(2022, 0, 0)),
            firstName: "guardian_firstname",
            lastName: "guardian_lastname",
        },
        waiverLink: 'https://link-to-waiver-form'
    }
    return handlebars.compile(template)(exampleData)
}

export function IsWorkHours(tz: string | null | undefined, fallback='America/Los_Angeles'): Boolean {
    let now = DateTime.local().setZone(tz || fallback)
    if (!now.isValid) {
        now = DateTime.local().setZone(fallback)
        if (!now.isValid) {
            return true
        }
    }
    return now.hour >= 9 && now.hour < 17
}

export function IsAfterEvent(event: Event): boolean {
    return new Date() > event.endDate
}

export function WouldSendLate(event: Event, ticket: Ticket, template: EmailTemplate) {
    if (template.whenFrom != "EVENTSTART") return false
    // @ts-ignore
    return ticket.createdAt > new Date(+event.startDate + ms(template.when))
}

export async function ProcessTicket(template: EmailTemplate,
                                    ticket: Ticket,
                                    smsBodyTemplate: Handlebars.TemplateDelegate,
                                    emailSubjectTemplate: Handlebars.TemplateDelegate,
                                    emailBodyTemplate: Handlebars.TemplateDelegate,
): Promise<void> {
    const event = ticket.event
    if (!event) return
    const venue = ticket.event?.venue || null
    const guardian = ticket.guardian || null
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

export async function ProcessTemplate(template: EmailTemplate): Promise<void> {
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
                    },
                    OR: [
                      { payment: null },
                      { payment: { complete: true }},
                    ],
                },
                ...extrafilters
            ]
        },
        include: {
            event: {
                include: {
                    venue: true
                }
            },
            guardian: true

        }
    })
    await Promise.all(tickets.map(async (ticket) => {
        await ProcessTicket(template, ticket, smsBodyTemplate, emailSubjectTemplate, emailBodyTemplate)
    }))
}


export async function QueueEmail(sendTo: string,
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

export async function SendQueuedEmails(): Promise<void> {
    await postmark.sendEmailBatch(emailQueue)
    // https://stackoverflow.com/a/1232046
    emailQueue.splice(0, emailQueue.length)
}

export async function SendText(sendTo: string,
                        smsBodyTemplate: Handlebars.TemplateDelegate,
                        data: TemplateData
): Promise<void> {
    await twilio.messages.create({from: config.twilio.number, to: sendTo, body: smsBodyTemplate(data)})
}

export default async function emails(): Promise<void> {
    const templates = await prisma.emailTemplate.findMany({
        where: {automatic: true}
    })
    await Promise.all(templates.map(async (template) => {
        await ProcessTemplate(template)
    }))
    await SendQueuedEmails()
}
