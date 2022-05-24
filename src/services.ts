import {PrismaClient} from '@prisma/client';
import {ServerClient} from "postmark"
import config from "./config";
import {Twilio} from "twilio";

export const prisma = new PrismaClient()
export const postmark = new ServerClient(config.postmark.serverToken || '');
export const twilio = new Twilio(config.twilio.sid, config.twilio.token);
