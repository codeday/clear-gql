import "reflect-metadata";
import config from './config'

import server from './server'
import { automaticDigests } from './webhooks';
import automaticEmails from "./emails";
import { automaticWaivers, waiverServer } from "./waivers";

server();
automaticEmails();
waiverServer();
automaticWaivers();
automaticDigests();
