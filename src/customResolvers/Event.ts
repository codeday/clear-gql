import {FieldResolver, Resolver, Ctx, Root} from "type-graphql";
import {Event} from "../generated/typegraphql-prisma";
import moment, {Moment} from 'moment'
@Resolver(of => Event)
export class CustomEventResolver {
    @FieldResolver(type => String)
    displayDate(
        @Root() event: Event,
    ): String {
        const startDate = moment(event.startDate)
        const endDate = moment(event.endDate)
        if (startDate.month() === endDate.month()) {
            return `${startDate.format('MMM Do')}-${endDate.format('Do YYYY')}`
        } else {
            return `${startDate.format('MMM Do')}-${endDate.format('MMM Do YYYY')}`
        }
    }
}
