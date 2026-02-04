import jwt from 'jsonwebtoken';
import config from '../src/config';

enum AuthRole {
    ATTENDEE = 'a',
    VOLUNTEER = 'v',
    MANAGER = 'm',
    ADMIN = 'A',
}

interface TokenPayload {
    t: AuthRole;  // type
    u?: string;   // username (required for manager/volunteer)
    iat?: number;
    exp?: number;
}

async function generateToken(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.error('Usage: yarn generate-token <role> [username]');
        console.error('Roles: admin, manager, volunteer, attendee');
        console.error('Note: manager and volunteer require a username');
        console.error('\nExamples:');
        console.error('  yarn generate-token admin');
        console.error('  yarn generate-token manager alice');
        process.exit(1);
    }

    const roleArg = args[0].toLowerCase();
    const username = args[1];

    const roleMap: { [key: string]: AuthRole } = {
        'admin': AuthRole.ADMIN,
        'manager': AuthRole.MANAGER,
        'volunteer': AuthRole.VOLUNTEER,
        'attendee': AuthRole.ATTENDEE,
    };

    if (!roleMap[roleArg]) {
        console.error(`Invalid role: ${roleArg}`);
        console.error(`Valid roles: ${Object.keys(roleMap).join(', ')}`);
        process.exit(1);
    }

    const role = roleMap[roleArg];

    if ((role === AuthRole.MANAGER || role === AuthRole.VOLUNTEER) && !username) {
        console.error(`Error: ${roleArg} role requires a username`);
        console.error(`Usage: yarn generate-token ${roleArg} <username>`);
        process.exit(1);
    }

    if (role === AuthRole.ADMIN && username) {
        console.error('Warning: admin tokens should not specify a username (ignoring)');
    }

    const payload: TokenPayload = {
        t: role,
    };

    if (username && (role === AuthRole.MANAGER || role === AuthRole.VOLUNTEER)) {
        payload.u = username;
    }

    const token = jwt.sign(payload, config.auth.secret, {
        audience: config.auth.audience,
        expiresIn: '24h',
    });

    console.log('\n=== Generated JWT Token ===');
    console.log(`\nToken:\n${token}\n`);
    console.log('=== Token Details ===');
    console.log(`Role: ${roleArg} (${role})`);
    if (username) {
        console.log(`Username: ${username}`);
    }
    console.log(`Audience: ${config.auth.audience}`);
    console.log('\nUsage:');
    console.log(`  export API_KEY="${token}"`);
    console.log(`  yarn test-queries\n`);
}

generateToken().catch((error) => {
    console.error('Error generating token:', error);
    process.exit(1);
});
