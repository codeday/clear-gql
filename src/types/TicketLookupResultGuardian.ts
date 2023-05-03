import { GraphQLJSONObject } from 'graphql-scalars';
import { Field, ObjectType } from 'type-graphql';
import { Prisma } from '@prisma/client';

@ObjectType()
export class TicketLookupResultGuardian {
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
}