import {
    Prisma,
    Person as PrismaPerson,
} from '@prisma/client';
import {
    ObjectType, Field, Authorized, Int
} from 'type-graphql';

@ObjectType
