import { PrismaClient } from '@prisma/client';
import cuid from 'cuid';

const prisma = new PrismaClient();

async function seedDummy(): Promise<void> {
    try {
        console.log('🌱 Seeding dummy data...\n');

        // Create an event group
        const eventGroup = await prisma.eventGroup.create({
            data: {
                name: 'CodeDay Spring 2025',
                startDate: new Date('2025-03-01T09:00:00Z'),
                endDate: new Date('2025-03-02T17:00:00Z'),
                ticketPrice: 25.0,
                earlyBirdPrice: 20.0,
                earlyBirdCutoff: new Date('2025-02-15T23:59:59Z'),
                groupPrice: 20.0,
                registrationCutoff: new Date('2025-02-28T23:59:59Z'),
                showcaseId: 'spring2025',
                metadata: {
                    testData: true,
                    environment: 'development',
                },
            },
        });

        console.log(`✓ Created event group: ${eventGroup.name} (${eventGroup.id})`);

        // Create a venue
        const venue = await prisma.venue.create({
            data: {
                name: 'Example Community Center',
                capacity: 50,
                addressLine1: '123 Main Street',
                city: 'Seattle',
                state: 'Washington',
                stateAbbreviation: 'WA',
                zipCode: '98101',
                country: 'United States',
                countryAbbreviation: 'US',
                mapLink: 'https://maps.google.com/?q=Seattle+WA',
                contactName: 'Venue Manager',
                contactEmail: 'venue@example.com',
                contactPhone: '555-0100',
                wifiSsid: 'CodeDay-Guest',
                wifiPassword: 'welcome123',
                metadata: { testData: true },
            },
        });

        console.log(`✓ Created venue: ${venue.name}`);

        // Create an event
        const event = await prisma.event.create({
            data: {
                name: 'CodeDay Seattle',
                startDate: new Date('2025-03-01T09:00:00Z'),
                endDate: new Date('2025-03-02T17:00:00Z'),
                ticketPrice: 25.0,
                earlyBirdPrice: 20.0,
                earlyBirdCutoff: new Date('2025-02-15T23:59:59Z'),
                groupPrice: 20.0,
                registrationCutoff: new Date('2025-02-28T23:59:59Z'),
                managers: ['alice'],
                registrationsOpen: true,
                contentfulWebname: 'seattle',
                showcaseId: 'seattle-spring2025',
                timezone: 'America/Los_Angeles',
                majorityAge: 18,
                minAge: 12,
                maxAge: 25,
                requiresPromoCode: false,
                eventGroupId: eventGroup.id,
                venueId: venue.id,
                metadata: {
                    testData: true,
                    environment: 'development',
                },
            },
        });

        console.log(`✓ Created event: ${event.name} (${event.id})`);

        // Create a sponsor
        const sponsor = await prisma.sponsor.create({
            data: {
                name: 'Example Corp',
                link: 'https://example.com',
                description: 'A generous sponsor',
                amount: 1000,
                contactName: 'Sponsor Contact',
                contactEmail: 'sponsor@example.com',
                eventId: event.id,
                metadata: { testData: true },
            },
        });

        console.log(`✓ Created sponsor: ${sponsor.name}`);

        // Create promo code
        const promoCode = await prisma.promoCode.create({
            data: {
                code: 'TESTCODE',
                type: 'SUBTRACT',
                amount: 5.0,
                uses: 10,
                eventId: event.id,
                metadata: { testData: true },
            },
        });

        console.log(`✓ Created promo code: ${promoCode.code}`);

        // Create guardians (parents)
        const guardian1 = await prisma.person.create({
            data: {
                firstName: 'Jane',
                lastName: 'Parent',
                email: 'jane.parent@example.com',
                phone: '555-0101',
                age: 42,
                metadata: { testData: true, role: 'guardian' },
            },
        });

        const guardian2 = await prisma.person.create({
            data: {
                firstName: 'John',
                lastName: 'Parent',
                email: 'john.parent@example.com',
                phone: '555-0102',
                age: 45,
                metadata: { testData: true, role: 'guardian' },
            },
        });

        console.log(`✓ Created guardians: ${guardian1.firstName}, ${guardian2.firstName}`);

        // Create student tickets
        const ticket1 = await prisma.ticket.create({
            data: {
                firstName: 'Ava',
                lastName: 'Student',
                email: 'ava@example.com',
                age: 16,
                type: 'STUDENT',
                eventId: event.id,
                personId: guardian1.id,
                metadata: { testData: true },
            },
        });

        const ticket2 = await prisma.ticket.create({
            data: {
                firstName: 'Ben',
                lastName: 'Student',
                email: 'ben@example.com',
                age: 17,
                type: 'STUDENT',
                eventId: event.id,
                personId: guardian2.id,
                promoCodeId: promoCode.id,
                metadata: { testData: true },
            },
        });

        console.log(`✓ Created student tickets: ${ticket1.firstName}, ${ticket2.firstName}`);

        // Create mentor ticket
        const mentorTicket = await prisma.ticket.create({
            data: {
                firstName: 'Charlie',
                lastName: 'Mentor',
                email: 'charlie@example.com',
                age: 24,
                type: 'MENTOR',
                eventId: event.id,
                metadata: { testData: true },
            },
        });

        console.log(`✓ Created mentor ticket: ${mentorTicket.firstName}`);

        // Create schedule items
        const scheduleItem1 = await prisma.scheduleItem.create({
            data: {
                type: 'Opening',
                name: 'Kickoff',
                description: 'Event kickoff and team formation',
                start: new Date('2025-03-01T09:00:00Z'),
                end: new Date('2025-03-01T10:00:00Z'),
                finalized: true,
                internal: false,
                eventId: event.id,
                metadata: { testData: true },
            },
        });

        const scheduleItem2 = await prisma.scheduleItem.create({
            data: {
                type: 'Workshop',
                name: 'Intro to Web Development',
                description: 'Learn the basics of HTML, CSS, and JavaScript',
                start: new Date('2025-03-01T14:00:00Z'),
                end: new Date('2025-03-01T15:30:00Z'),
                finalized: true,
                internal: false,
                eventId: event.id,
                metadata: { testData: true },
            },
        });

        console.log(`✓ Created schedule items: ${scheduleItem1.name}, ${scheduleItem2.name}`);

        console.log('\n✅ Seed data created successfully!\n');
        console.log('=== Quick Reference ===');
        console.log(`Event ID: ${event.id}`);
        console.log(`Event Group ID: ${eventGroup.id}`);
        console.log(`Promo Code: ${promoCode.code}`);
        console.log(`\nGenerate tokens:`);
        console.log(`  Admin:    yarn generate-token admin`);
        console.log(`  Manager:  yarn generate-token manager alice`);
        console.log(`  Volunteer: yarn generate-token volunteer charlie`);
        console.log(`\nTest queries: export API_KEY="<token>" && yarn test-queries\n`);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

seedDummy();
