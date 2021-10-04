import path from 'path';
import { buildSchema, Authorized } from 'type-graphql';
import { GraphQLSchema } from 'graphql';
import { Container } from 'typedi';
import {
    resolvers,
    applyResolversEnhanceMap,
    ModelsEnhanceMap,
    applyModelsEnhanceMap,
    crudResolvers,
    EventCrudResolver,
    ScheduleItemCrudResolver,
    Venue,
    Event,
    EventScalarFieldEnum
} from './generated/typegraphql-prisma';
import customResolvers from './customResolvers'
import { authChecker, AuthRole } from './context';
import customResolversEnhanceMap from "./customResolversEnhanceMap";
import customModelsEnhanceMap from "./customModelsEnhanceMap";

export async function createSchema() : Promise<GraphQLSchema> {
    applyResolversEnhanceMap(customResolversEnhanceMap)
    applyModelsEnhanceMap(customModelsEnhanceMap)
    return buildSchema({
        resolvers: [
            ...resolvers,
            ...customResolvers
        ],
        container: Container,
        emitSchemaFile: path.resolve(
            __dirname,
            '../generated/generated-schema.graphql',
        ),
        validate: false,
        authChecker,
    });
}
