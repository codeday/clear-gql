import { GraphQLJSONObject } from 'graphql-scalars';
import { Field, ObjectType } from 'type-graphql';
import { Prisma } from '@prisma/client';
import { TicketLookupResultGuardian } from './TicketLookupResultGuardian';
import { Event } from '../generated/typegraphql-prisma';
import { TicketLookupResultPayment } from './TicketLookupResultPayment';
import { TicketLookupResultPromoCode } from './TicketLookupResultPromoCode';

@ObjectType()
export class TicketLookupResult {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  privateKey: string | null;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => String, { nullable: true })
  email: string | null;

  @Field(() => String, { nullable: true })
  phone: string | null;

  @Field(() => String, { nullable: true })
  whatsApp: string | null;

  @Field(() => String, { nullable: true })
  username: string | null;

  @Field(() => Number, { nullable: true })
  age: Number | null;

  @Field(() => TicketLookupResultGuardian, { nullable: true })
  guardian: TicketLookupResultGuardian | null;

  @Field(() => GraphQLJSONObject, { nullable: true })
  surveyResponses: Prisma.JsonValue;

  @Field(() => Event)
  event: Event;

  @Field(() => TicketLookupResultPayment, { nullable: true })
  payment: TicketLookupResultPayment | null;

  @Field(() => Boolean)
  waiverSigned: boolean;

  @Field(() => String, { nullable: true })
  waiverUrl: string | null;

  @Field(() => String, { nullable: true })
  waiverPdfUrl: string | null;

  @Field(() => TicketLookupResultPromoCode, { nullable: true })
  promoCode: TicketLookupResultPromoCode | null;
}