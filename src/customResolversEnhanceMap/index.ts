import {ResolversEnhanceMap,} from "../generated/typegraphql-prisma";
import {scheduleitemEnhanceConfig} from "./ScheduleItem";
import {personEnhanceConfig} from "./Person";
import {paymentEnhanceConfig} from "./Payment";
import {sponsorEnhanceConfig} from "./Sponsor";
import {ticketEnhanceConfig} from "./Ticket";
import {eventEnhanceConfig} from "./Event";
import {eventgroupEnhanceConfig} from "./EventGroup";
import {venueEnhanceConfig} from "./Venue";
import {promocodeEnhanceConfig} from "./PromoCode";
import {mailinglistmemberEnhanceConfig} from "./MailingListMember";
import {eventRestrictionEnhanceConfig} from "./EventRestriction";
import {emailtemplateEnhanceConfig} from "./EmailTemplate";
import {webhookEnhanceConfig} from './Webhook';

const customResolversEnhanceMap: ResolversEnhanceMap =
    {
        ScheduleItem: scheduleitemEnhanceConfig,
        Payment: paymentEnhanceConfig,
        Person: personEnhanceConfig,
        Sponsor: sponsorEnhanceConfig,
        Ticket: ticketEnhanceConfig,
        Event: eventEnhanceConfig,
        EventGroup: eventgroupEnhanceConfig,
        Venue: venueEnhanceConfig,
        PromoCode: promocodeEnhanceConfig,
        MailingListMember: mailinglistmemberEnhanceConfig,
        EventRestriction: eventRestrictionEnhanceConfig,
        EmailTemplate: emailtemplateEnhanceConfig,
        Webhook: webhookEnhanceConfig,
    }

export default customResolversEnhanceMap
