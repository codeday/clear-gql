import express from 'express';
import { json } from 'body-parser';
import dot from "dot-object";
import { Prisma } from "@prisma/client";
import { prisma } from '../services';
import config from '../config';
import { StatisticsFilteringParameters } from 'postmark/dist/client/models';

interface WaiverPayload {
  id: string
  template_id: string
  tracking_id: string
  status: 'pending' | 'approved' | 'revoked'
  pictures?: { id: string, timestamp: number, title: string }[]
}

const app = express();
app.use(json());
app.post(`/waiver-signed/${config.waiver.signedSecret}`, async (req, res) => {
  const payload = <WaiverPayload>req.body;
  await prisma.ticket.updateMany({
    where: { waiverTrackingId: payload.tracking_id },
    data: {
      waiverSigned: true,
      waiverSignedId: payload.id
    },
  });
  if ((req.body.pictures?.length || 0) > 0) {
    const ticket = await prisma.ticket.findFirst({
      where: { waiverTrackingId: payload.tracking_id },
      select: { metadata: true }
    });
    if (ticket) {
      const metadataObject = ticket.metadata as Prisma.JsonObject || {}
      dot.str('vaccineVerified', 'true', metadataObject)
      await prisma.ticket.updateMany({
        where: { waiverTrackingId: payload.tracking_id },
        data: { metadata: metadataObject },
      });
    }
  }
  res.send('ok');
});

export function waiverServer() {
  app.listen(
    config.waiver.signedPort,
    () => console.log(`Waiver server listening on http://0.0.0.0:${config.waiver.signedPort}`)
  );
}
