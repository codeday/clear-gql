import { PrismaClient } from '@prisma/client';
import { ExpressContext } from 'apollo-server-express/dist/ApolloServer';
import { AuthContext } from './auth';

export * from './auth';

const prisma = new PrismaClient();

export interface Context {
    prisma: PrismaClient,
    auth: AuthContext,
}

export async function createContext({ req }: ExpressContext): Promise<Context> {
    const tokenHeader = (req.header('X-Clear-Authorization') || req.header('Authorization') || '').split(/\s+/);
    const token = tokenHeader[0] === 'Bearer' ? tokenHeader[1].trim() : undefined;

    return {
        prisma,
        auth: new AuthContext(token),
    };
}
