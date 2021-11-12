import { config as loadEnv } from 'dotenv';

loadEnv();

[
    'DATABASE_URL',
    'AUTH_SECRET',
    'AUTH_AUDIENCE',
].forEach((req) => { if (!process.env[req]) throw Error(`The ${req} environment variable is required.`); });

const config = {
    debug: process.env.NODE_ENV !== 'production',
    port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 5000,
    auth: {
        secret: process.env.AUTH_SECRET!,
        audience: process.env.AUTH_AUDIENCE!,
    },
    postmark: {
        serverToken: process.env.POSTMARK_KEY,
    },
    twilio: {
        sid: process.env.TWILIO_SID || '',
        token: process.env.TWILIO_TOKEN || '',
        number: process.env.TWILIO_TEXT_NUMBER,
    },
};

export default config;
