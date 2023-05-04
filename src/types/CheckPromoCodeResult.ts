
import { Field, ObjectType } from 'type-graphql';
import { GraphQLJSONObject } from 'graphql-scalars';
import { Prisma } from '@prisma/client';

@ObjectType()
export class CheckPromoCodeResult {
    @Field(() => Boolean)
    valid: boolean;

    @Field(() => String, { nullable: true })
    displayDiscountName: string | null | undefined;

    @Field(() => String, { nullable: true })
    displayDiscountAmount: string | null | undefined;

    @Field(() => String, { nullable: true })
    discountType: string | null | undefined;

    @Field(() => Number, { nullable: true })
    discountAmount: number | null | undefined;

    @Field(() => Number, { nullable: true })
    effectivePrice: number | null | undefined;

    @Field(() => Number, { nullable: true })
    remainingUses: number | null | undefined;

    @Field(() => GraphQLJSONObject, { nullable: true })
    metadata: Prisma.JsonValue | null | undefined;
}