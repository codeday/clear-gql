import { config as loadEnv } from 'dotenv';

loadEnv();

[
    'DATABASE_URL',
    'AUTH_SECRET',
    'AUTH_AUDIENCE',
    'POSTMARK_KEY',
    'TWILIO_SID',
    'TWILIO_TOKEN',
    'TWILIO_TEXT_NUMBER',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_SECRET',
    'WAIVER_MINOR_ID',
    'WAIVER_ADULT_ID',
    'WAIVER_API_KEY',
    'WAIVER_SIGNED_PORT',
    'WAIVER_SIGNED_SECRET',
].forEach((req) => { if (!process.env[req]) throw Error(`The ${req} environment variable is required.`); });

const config = {
    debug: process.env.NODE_ENV !== 'production',
    port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 5000,
    auth: {
        secret: process.env.AUTH_SECRET!,
        audience: process.env.AUTH_AUDIENCE!,
    },
    postmark: {
        serverToken: process.env.POSTMARK_KEY!,
    },
    twilio: {
        sid: process.env.TWILIO_SID!,
        token: process.env.TWILIO_TOKEN!,
        number: process.env.TWILIO_TEXT_NUMBER!,
    },
    waiver: {
        minorId: process.env.WAIVER_MINOR_ID!,
        adultId: process.env.WAIVER_ADULT_ID!,
        apiKey: process.env.WAIVER_API_KEY!,
        signedPort: Number.parseInt(process.env.WAIVER_SIGNED_PORT!, 10) || 8090,
        signedSecret: process.env.WAIVER_SIGNED_SECRET!,
    },
};

export default config;
