import path from 'path';
import { buildSchema } from 'type-graphql';
import { GraphQLSchema } from 'graphql';
import { Container } from 'typedi';
import {resolvers} from './generated/typegraphql-prisma';
import customResolvers from './customResolvers'
// import { authChecker } from './context';

export async function createSchema() : Promise<GraphQLSchema> {
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
        // authChecker,
    });
}
