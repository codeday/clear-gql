import {FieldResolver, Resolver, Ctx, Root} from "type-graphql";
import {EventGroup} from "../generated/typegraphql-prisma";
import moment from 'moment'

@Resolver(of => EventGroup)
export class CustomEventGroupResolver {
    @FieldResolver(type => String)
    displayDate(
        @Root() group: EventGroup,
    ): String {
        const startDate = moment(group.startDate)
        const endDate = moment(group.endDate)
        if (startDate.month() === endDate.month()) {
            return `${startDate.format('MMM Do')}-${endDate.format('Do YYYY')}`
        } else {
            return `${startDate.format('MMM Do')}-${endDate.format('MMM Do YYYY')}`
        }
    }
}
