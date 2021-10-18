import {ArgsType, Field} from "type-graphql";
import {
    CreateTicketArgs,
    EventWhereUniqueInput,
    PersonCreateInput,
    Ticket,
    TicketCreateInput, TicketCreateWithoutEventInput
} from "../generated/typegraphql-prisma";

@ArgsType()
export class RegisterForEventArgs {
    @Field(_type => EventWhereUniqueInput, {
        nullable: false
    })
    eventWhere!: EventWhereUniqueInput;

    @Field(_type => TicketCreateWithoutEventInput, {
        nullable: false
    })
    ticketData!: TicketCreateWithoutEventInput;

    @Field(_type => PersonCreateInput, {
    nullable: true
    })
    guardianData: PersonCreateInput | undefined;

    @Field(_type => String, {
        nullable: true
    })
    promoCode: string | undefined;
}
