import { Ticket, Event, Person } from '@prisma/client';
import { DateTime } from 'luxon';
import fetch from 'node-fetch';
import config from '../config';
import { prisma, postmark, twilio } from '../services';

export * from './server';

const WAIVERFOREVER_API_BASE = 'https://api.waiverforever.com/openapi/v1';
interface WaiverForeverApiResult {
  result: boolean,
  msg: string,
  data: {
    tracking_id: string,
    request_waiver_url: string,
    ttl: number,
  }
}

function isAdult(ticket: Ticket & { event: Event }): boolean {
  return (ticket.age && ticket.age >= ticket.event.majorityAge) || !ticket.personId;
}

export async function requestWaiver(ticket: Ticket & { event: Event }): Promise<string> {
  if (ticket.waiverUrl) return ticket.waiverUrl;

  const waiverId = isAdult(ticket)
    ? (ticket.event.adultWaiverId || config.waiver.adultId)
    : (ticket.event.minorWaiverId || config.waiver.minorId);
  const ttl = Math.ceil(Math.max(Math.abs(DateTime.fromJSDate(ticket.event.endDate).diffNow().as('seconds')), 86400));

  const waiverRequestResult: WaiverForeverApiResult = await (await fetch(
    WAIVERFOREVER_API_BASE + `/template/${waiverId}/requestWaiver?ttl=${ttl}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Api-Key': config.waiver.apiKey,
      }
    }
  )).json();

  if (!waiverRequestResult.result) throw new Error(`Could not request waiver: ${waiverRequestResult.msg}`);

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      waiverTrackingId: waiverRequestResult.data.tracking_id,
      waiverUrl: waiverRequestResult.data.request_waiver_url,
    },
  });

  return waiverRequestResult.data.request_waiver_url;
}

export async function sendWaiverReminder(ticket: Ticket & { event: Event, guardian: Person | null }): Promise<void> {
  const signingUrl = ticket.waiverUrl || await requestWaiver(ticket);
  const adult = isAdult(ticket);
  const emailTo = adult ? ticket.email : ticket.guardian?.email;
  const phoneTo = adult ? ticket.phone : ticket.guardian?.phone;

  if (phoneTo) {
    await twilio.messages.create({
      from: config.twilio.number,
      to: phoneTo,
      body: `Please sign the CodeDay waiver${adult ? ` for ${ticket.firstName}` : ''}: ${signingUrl}`,
    });
  }

  if (emailTo) {
    await postmark.sendEmail({
      To: emailTo,
      From: '"CodeDay" <legal@codeday.org>',
      Subject: '[Action Required] Sign Your CodeDay Waiver',
      TextBody: `${adult ? `You're` : `${ticket.firstName} is`} registered for CodeDay. To check-in, you must sign a waiver. E-sign ${adult ? 'your' : `${ticket.firstName}'s`} waiver now at: ${signingUrl}`
    });
  }
}

