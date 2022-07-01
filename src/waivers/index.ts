import { Ticket, Event, Person } from '@prisma/client';
import { DateTime } from 'luxon';
import fetch from 'node-fetch';
import config from '../config';
import { prisma, postmark, twilio, uploader } from '../services';
import { streamToBuffer } from '../utils';
import schedule from "node-schedule";

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

  const waiverRequestResult: WaiverForeverApiResult = await (await fetch(
    WAIVERFOREVER_API_BASE + `/template/${waiverId}/requestWaiver?ttl=7257600`,
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
  const whatsAppTo = adult ? ticket.whatsApp : ticket.guardian?.whatsApp;
  const phoneWhatsAppBody = `Please sign the CodeDay waiver${adult ? '' : ` for ${ticket.firstName}`}: ${signingUrl}`;

  if (whatsAppTo) {
    await twilio.messages.create({
      to: `whatsapp:${whatsAppTo}`,
      body: phoneWhatsAppBody,
      messagingServiceSid: config.twilio.service,
    });
  } else if (phoneTo) {
    await twilio.messages.create({
      to: phoneTo,
      body: phoneWhatsAppBody,
      messagingServiceSid: config.twilio.service,
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

async function syncWaiverPdf(ticket: Pick<Ticket, 'id' | 'waiverSignedId'>): Promise<void> {
  if (!ticket.waiverSignedId) return;
  console.log(`Syncing waiver for ${ticket.id}...`);
  const response = await fetch(`${WAIVERFOREVER_API_BASE}/waiver/${ticket.waiverSignedId}/pdf`, {
      headers: {
        Accept: '*.*',
        'X-Api-Key': config.waiver.apiKey,
      },
      redirect: 'follow',
  });
  if (!response.redirected) return;
  console.log(`...fetched waiver from waiverforever`);

  const { url } = await uploader.file(await streamToBuffer(response.body), 'file.pdf');
  console.log(`...uploaded at ${url}`);
  await prisma.ticket.update({ where: { id: ticket.id }, data: { waiverPdfUrl: url } });
}

export async function syncAllWaiverPdfs() {
  const needsSync = await prisma.ticket.findMany({
    where: { waiverSignedId: { not: null }, waiverPdfUrl: null },
    select: { id: true, waiverSignedId: true },
  });
  for (const ticket of needsSync) {
    try {
      await syncWaiverPdf(ticket);
    } catch (ex) { console.error(ex); }
  }
}

export async function automaticWaivers(): Promise<void> {
    const job = schedule.scheduleJob('*/5 * * * *', syncAllWaiverPdfs);
    job.invoke();
}
