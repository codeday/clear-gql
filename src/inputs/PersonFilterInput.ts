import {InputType, Field} from 'type-graphql';
import { Prisma} from '@prisma/client';

@InputType()
export class PersonFilterInput {
    @Field(() => String, {nullable: true})
    firstName?: string

    toQuery(): Prisma.PersonWhereInput {
        return {
            firstName: this.firstName
        };
    }
}
