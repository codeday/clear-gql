import {EventScalarFieldEnum, ModelConfig} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.keys(EventScalarFieldEnum).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)] )

export const eventEnhanceConfig: ModelConfig<"Event"> = {
    fields: {
        ...defaultPerms,
        id: [],
        name: [],
        ticketPrice: [],
        earlyBirdPrice: [],
        groupPrice: [],
        earlyBirdCutoff: [],
        contentfulWebname: [],
        contentfulEventRestrictions: [],
        registrationCutoff: [],
        startDate: [],
        endDate: [],
        registrationsOpen: [],
        eventRestrictions: [],
        timezone: [],
        majorityAge: [],
        overnightMinAge: [],
        minAge: [],
        maxAge: [],
        requiresPromoCode: [],
    }
}
