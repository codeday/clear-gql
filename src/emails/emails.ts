import {PrismaClient} from '@prisma/client';
import {mintWaiverLink} from "./waiver";
import {Message, ServerClient} from "postmark"
import config from "../config";
import {marked} from "marked";
import {Twilio} from "twilio";
import ms from 'ms';
import * as handlebars from "handlebars";
import {DateTime} from 'luxon';

const prisma = new PrismaClient()
const postmark = new ServerClient(config.postmark.serverToken || '');
const twilio = new Twilio(config.twilio.sid, config.twilio.token);

function IsWorkHours(tz: string | undefined, fallback='America/Los_Angeles'): Boolean {
    let now = DateTime.local().setZone(tz)
    if (!now.isValid) {
        now = DateTime.local().setZone(fallback)
        if (!now.isValid) {
            return true
        }
    }
    return now.hour >= 9 && now.hour < 17
}


export default async function emails() {
    const templates = await prisma.emailTemplate.findMany({
        where: {automatic: true}
    })
    await Promise.all(templates.map(async (template) => {
        const extrafilters = []
        const emails: Message[] | { To: string; ReplyTo: string; From: string; HtmlBody: string; Subject: string; MessageStream: string; }[] = []
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
            const event = await prisma.event.findUnique({where: {id: ticket.eventId}})
            if (!event) return
            const venue = event.venueId? await prisma.venue.findUnique({where: {id: event.venueId || undefined}}) : null
            const guardian = ticket.personId? await prisma.person.findUnique({where: {id: ticket.personId || undefined}}) : null
            const data = {
                ticket,
                event,
                venue,
                guardian,
                waiverLink: mintWaiverLink(ticket)
            }
            if(template.sendInWorkHours && !IsWorkHours(event.timezone || undefined)) return
            if(!template.sendAfterEvent && new Date() > event.endDate) return
            // @ts-ignore
            if(!template.sendLate && template.whenFrom == "EVENTSTART" && ticket.createdAt > new Date(event.startDate - offset)) return
            if(template.sendParent) {
                if(!guardian) return
                if(template.sendText && guardian.phone) {
                    twilio.messages.create({from: config.twilio.number, to: guardian.phone, body: smsBodyTemplate(data)})
                } else if(guardian.email) {
                    emails.push(
                        {
                            To: guardian.email,
                            ReplyTo: template.replyTo,
                            From: `${template.fromName} <${template.fromEmail}>`,
                            Subject: emailSubjectTemplate(data),
                            HtmlBody: marked.parse(emailBodyTemplate(data)),
                            MessageStream: template.marketing? "attendees" : "outbound"
                        }
                    )
                }
            } else {
                if(template.sendText && ticket.phone) {
                    twilio.messages.create({from: config.twilio.number, to: ticket.phone, body: smsBodyTemplate(data)})
                } else if(ticket.email) {
                    emails.push(
                        {
                            To: ticket.email,
                            ReplyTo: template.replyTo,
                            From: `${template.fromName} <${template.fromEmail}>`,
                            Subject: emailSubjectTemplate(data),
                            HtmlBody: marked.parse(emailBodyTemplate(data)),
                            MessageStream: template.marketing? "attendees" : "outbound"
                        }
                    )
                }
            }
            await prisma.ticket.update({where: {id: ticket.id}, data: {sentEmails: {connect: {id: template.id}}}})
        }))
        await postmark.sendEmailBatch(emails)
    }))
}
