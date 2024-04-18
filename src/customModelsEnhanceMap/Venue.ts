import {VenueScalarFieldEnum, ModelConfig} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.keys(VenueScalarFieldEnum).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)])

export const venueEnhanceConfig: ModelConfig<"Venue"> = {
    fields: {
        ...defaultPerms,
        id: [],
        // TODO(@oohwooh) - only expose when registrations enabled
        name: [],
        mapLink: [],
        addressLine1: [],
        addressLine2: [],
        addressLine3: [],
        city: [],
        state: [],
        zipCode: [],
        country: [],
        countryAbbreviation: [],
        stateAbbreviation: [],
        wifiSsid: [],
        wifiPassword: [],
    }
}
