import { DateTime } from 'luxon';
import { prisma } from '../services';
import { sendWebhook } from './sendWebhook';


export async function eventConfigWatchdog(): Promise<void> {
  const has_venue_closed_regs = await prisma.event.findMany({ where: { venueId: { not: null }, registrationsOpen: false, startDate: { gt: DateTime.now().toJSDate() } }});
  const has_regs_no_venue = await prisma.event.findMany({ where: { venueId: null, registrationsOpen: true, startDate: { gt: DateTime.now().toJSDate() } } });
  const watchdog_hooks = await prisma.webhook.findMany({ where: { type: 'WATCHDOG' } });

  watchdog_hooks.forEach(async (h) => {
    if(has_venue_closed_regs.length > 0) {
      await sendWebhook(h, { title: 'WARNING: Events with venue and closed registrations', message: has_venue_closed_regs.map((e) => `${e.name}: https://clear.codeday.org/events/${e.id}`).join('\n') })
    }
  })

  watchdog_hooks.forEach(async (h) => {
    if(has_regs_no_venue.length > 0) {
      await sendWebhook(h, { title: 'URGENT: Events with open registrations and no venue', message: has_regs_no_venue.map((e) => `${e.name}: https://clear.codeday.org/events/${e.id}`).join('\n') })
    }
  })
}