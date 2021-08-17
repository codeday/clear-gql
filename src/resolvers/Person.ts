import {Arg, Authorized, Resolver, Query, Mutation} from "type-graphql";
import {Person} from "../generated/typegraphql-prisma";
import { Inject, Service } from "typedi";
import {PrismaClient, Person as PrismaPerson} from '@prisma/client';
import {PersonFilterInput} from "../inputs/PersonFilterInput";

@Service()
@Resolver(Person)
export class PersonResolver {
    @Inject(() => PrismaClient)
    private readonly prisma : PrismaClient

     @Query(() => [Person])
    async people(
        @Arg('where', () => PersonFilterInput, {nullable: true}) where?: PersonFilterInput,
        @Arg('skip', () => Number, {nullable: true}) skip?: number,
        @Arg('take', () => Number, {nullable: true }) take?: number,
     ): Promise<PrismaPerson[]> {
        return this.prisma.person.findMany({ where: where?.toQuery(), skip, take })
     }

     @Mutation(() => Person)
    async createPerson(
        @Arg('data', () => )
     )
}
