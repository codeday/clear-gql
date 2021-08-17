import {InputType, Field, Int } from 'type-graphql';
import { Prisma } from '@prisma/client';

@InputType()
export class PersonCreateInput {
    @Field(() => String)
    firstName: string

    @Field(() => String)
    lastName: string

    @Field(() => String)
    email: string

    @Field(() => String)
    phone?: string

    @Field(() => Int)
    age?: Int

    toQuery: Prisma.PersonCreateInput
}
