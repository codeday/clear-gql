import {Prisma, PrismaClient} from '@prisma/client';
import {renderStudentWaiverEmail, renderStudentWaiverText} from "./waiver";
import { Message, ServerClient} from "postmark"
import config from "../config";
import dot from 'dot-object';
import {marked} from "marked";
import { Twilio } from "twilio";

const prisma = new PrismaClient()
const postmark = new ServerClient(config.postmark.serverToken || '');
const twilio = new Twilio(config.twilio.sid, config.twilio.token);

export default async function emails() {
    const tickets = await prisma.ticket.findMany({
        where: {type: "STUDENT"}, select: {
            id: true,
            firstName: true,
            age: true,
            email: true,
            phone: true,
            metadata: true,
            event: {
                select: {
                    name: true,
                    venue: {
                        select: {
                            address: true,
                        }
                    }
                }
            }
        }
    })
    const emails: Message[] | { To: string; ReplyTo: string; From: string; HtmlBody: string; Subject: string; }[] = []
    tickets.forEach(async (ticket): Promise<void> => {
        const metadata = ticket.metadata as Prisma.JsonObject || {}
        const metadataObject = ticket.metadata as Prisma.JsonObject || {}
        if (metadata.waiverSent) return
        if(ticket.email) {
            // @ts-ignore
            const emailText = renderStudentWaiverEmail(ticket)
            emails.push({
                To: ticket.email,
                ReplyTo: 'team@codeday.org',
                From: 'John Peter <johnpeter@codeday.org>',
                HtmlBody: marked.parse(emailText),
                Subject: '[Action Required] It\'s almost CodeDay!',
            })
            dot.str('waiverSent', true, metadataObject)
            await prisma.ticket.update({where: {id: ticket.id}, data: {metadata: metadataObject}})
        }
        else if(ticket.phone) {
            // @ts-ignore
            const msgText = renderStudentWaiverText(ticket)
            twilio.messages.create({from: config.twilio.number, to: ticket.phone, body: msgText})
            await prisma.ticket.update({where: {id: ticket.id}, data: {metadata: metadataObject}})
        }
    })
    console.log(emails)
    await postmark.sendEmailBatch(emails);
}

emails()
