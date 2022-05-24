import "reflect-metadata";
import config from './config'

import server from './server'
import leaderboard from "./leaderboard";
import automaticEmails from "./emails";
import { automaticWaivers, waiverServer } from "./waivers";

server();
leaderboard();
automaticEmails();
waiverServer();
automaticWaivers();
