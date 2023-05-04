
import { Field, ObjectType } from 'type-graphql';
import { GraphQLJSONObject } from 'graphql-scalars';
import { Prisma } from '@prisma/client';

@ObjectType()
export class TicketLookupResultPromoCode {
    @Field(() => String, { nullable: true })
    displayDiscountName: string | null | undefined;

    @Field(() => String, { nullable: true })
    displayDiscountAmount: string | null | undefined;

    @Field(() => String, { nullable: true })
    discountType: string | null | undefined;

    @Field(() => Number, { nullable: true })
    discountAmount: number | null | undefined;

    @Field(() => GraphQLJSONObject, { nullable: true })
    metadata: Prisma.JsonValue | null | undefined;
}