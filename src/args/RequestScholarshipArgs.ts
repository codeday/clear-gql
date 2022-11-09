import {ArgsType, Field, registerEnumType} from "type-graphql";
import {
    CreateTicketArgs,
    EventWhereUniqueInput,
    PersonCreateInput,
    Ticket,
    TicketCreateInput, TicketCreateWithoutEventInput
} from "../generated/typegraphql-prisma";

export enum ScholarshipReason {
  FAMILY_CANT_AFFORD = "FAMILY_CANT_AFFORD",
  FAMILY_UNSURE = "FAMILY_UNSURE",
  CANT_AFFORD = "CANT_AFFORD",
  DONT_BELIEVE_PAY = "DONT_BELIEVE_PAY",
  OTHER = "OTHER",
}
registerEnumType(ScholarshipReason, { name: "ScholarshipReason" });

@ArgsType()
export class RequestScholarshipArgs {
    @Field(_type => EventWhereUniqueInput, {
        nullable: false
    })
    eventWhere!: EventWhereUniqueInput;

    @Field(_type => TicketCreateWithoutEventInput, {
        nullable: true
    })
    ticketData!: TicketCreateWithoutEventInput;

    @Field(_type => [TicketCreateWithoutEventInput], {
        nullable: true
    })
    ticketsData!: TicketCreateWithoutEventInput[];

    @Field(_type => PersonCreateInput, {
    nullable: true
    })
    guardianData: PersonCreateInput | undefined;

    @Field(_type => ScholarshipReason)
    scholarshipReason: ScholarshipReason;

    @Field(_type => String, {
        nullable: true
    })
    scholarshipReasonOther: string | undefined;
}
