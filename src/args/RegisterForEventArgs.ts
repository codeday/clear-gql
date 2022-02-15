import {ArgsType, Field, registerEnumType} from "type-graphql";
import {
    CreateTicketArgs,
    EventWhereUniqueInput,
    PersonCreateInput,
    Ticket,
    TicketCreateInput, TicketCreateWithoutEventInput
} from "../generated/typegraphql-prisma";

export enum PaymentProvider {
  stripe = "stripe",
  razorpay = "razorpay",
}
registerEnumType(PaymentProvider, { name: "PaymentProvider" });

@ArgsType()
export class RegisterForEventArgs {
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

    @Field(_type => String, {
        nullable: true
    })
    promoCode: string | undefined;

    @Field(_type => PaymentProvider, {
      defaultValue: PaymentProvider.stripe
    })
    paymentProvider: PaymentProvider;
}
