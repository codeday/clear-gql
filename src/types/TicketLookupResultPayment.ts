import { GraphQLJSONObject } from 'graphql-scalars';
import { Field, ObjectType } from 'type-graphql';
import { Prisma } from '@prisma/client';

@ObjectType()
export class TicketLookupResultPayment {
  @Field(() => String)
  id: string;

  @Field(() => String)
  paymentProvider: string;

  @Field(() => Boolean)
  complete: boolean;
}