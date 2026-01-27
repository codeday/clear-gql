import fetch from 'node-fetch';

const API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:4000/graphql';
const API_KEY = process.env.API_KEY;

interface GraphQLResponse {
    data?: Record<string, unknown>;
    errors?: Array<{ message: string }>;
}

async function query(
    queryString: string,
    variables?: Record<string, unknown>,
    headers?: Record<string, string>
): Promise<GraphQLResponse> {
    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (API_KEY) {
        defaultHeaders['Authorization'] = `Bearer ${API_KEY}`;
    }

    const finalHeaders = { ...defaultHeaders, ...headers };

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: finalHeaders,
            body: JSON.stringify({
                query: queryString,
                variables: variables || {},
            }),
        });

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            return { errors: [{ message: `HTTP ${response.status}` }] };
        }

        const result = (await response.json()) as GraphQLResponse;
        return result;
    } catch (error) {
        console.error('Fetch error:', error);
        return { errors: [{ message: String(error) }] };
    }
}

async function runTests(): Promise<void> {
    console.log(`\n🚀 Testing GraphQL API at ${API_ENDPOINT}\n`);

    if (API_KEY) {
        console.log('🔐 Using Bearer token authentication\n');
    } else {
        console.log('⚠️  No API_KEY provided. Some queries may fail.\n');
    }

    // Test 1: Health check
    console.log('Test 1: Server Health');
    const healthQuery = `
    query {
      __typename
    }
  `;

    const healthResult = await query(healthQuery);
    if (healthResult.data) {
        console.log('✓ Server is running\n');
    } else {
        console.log('✗ Server health check failed\n');
        return;
    }

    // Test 2: List Events
    console.log('Test 2: List Events');
    const eventsQuery = `
    query {
      events {
        id
        name
        startDate
        endDate
        registrationsOpen
        ticketPrice
      }
    }
  `;

    const eventsResult = await query(eventsQuery);
    if (eventsResult.data) {
        const events = eventsResult.data.events as Array<any>;
        console.log(`✓ Found ${events.length} event(s)`);
        events.forEach((event: any) => {
            console.log(`  - ${event.name} (${event.id})`);
            console.log(`    ${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}`);
            console.log(`    Price: $${event.ticketPrice}, Open: ${event.registrationsOpen}`);
        });
        console.log();
    } else if (eventsResult.errors) {
        console.log(`✗ Error: ${eventsResult.errors[0].message}\n`);
    }

    // Test 3: List Event Groups
    console.log('Test 3: List Event Groups');
    const eventGroupsQuery = `
    query {
      eventGroups {
        id
        name
        startDate
        endDate
        events {
          id
          name
        }
      }
    }
  `;

    const eventGroupsResult = await query(eventGroupsQuery);
    if (eventGroupsResult.data) {
        const eventGroups = eventGroupsResult.data.eventGroups as Array<any>;
        console.log(`✓ Found ${eventGroups.length} event group(s)`);
        eventGroups.forEach((group: any) => {
            console.log(`  - ${group.name} (${group.id})`);
            console.log(`    Events: ${group.events.map((e: any) => e.name).join(', ')}`);
        });
        console.log();
    } else if (eventGroupsResult.errors) {
        console.log(`✗ Error: ${eventGroupsResult.errors[0].message}\n`);
    }

    // Test 4: Get tickets for first event (if any)
    if (eventsResult.data && (eventsResult.data.events as Array<any>).length > 0) {
        const firstEventId = (eventsResult.data.events as Array<any>)[0].id;
        console.log(`Test 4: List Tickets for Event ${firstEventId}`);
        const ticketsQuery = `
      query {
        tickets(where: { eventId: { equals: "${firstEventId}" } }) {
          id
          firstName
          lastName
          email
          type
          age
          checkedIn
        }
      }
    `;

        const ticketsResult = await query(ticketsQuery);
        if (ticketsResult.data) {
            const tickets = ticketsResult.data.tickets as Array<any>;
            console.log(`✓ Found ${tickets.length} ticket(s)`);
            tickets.forEach((ticket: any) => {
                const checkedIn = ticket.checkedIn ? '✓' : '✗';
                console.log(`  ${checkedIn} ${ticket.firstName} ${ticket.lastName} (${ticket.type})`);
                if (ticket.email) console.log(`    Email: ${ticket.email}`);
                if (ticket.age) console.log(`    Age: ${ticket.age}`);
            });
            console.log();
        } else if (ticketsResult.errors) {
            console.log(`✗ Error: ${ticketsResult.errors[0].message}\n`);
        }
    }

    // Test 5: Get venues
    console.log('Test 5: List Venues');
    const venuesQuery = `
    query {
      venues {
        id
        name
        capacity
        city
        state
      }
    }
  `;

    const venuesResult = await query(venuesQuery);
    if (venuesResult.data) {
        const venues = venuesResult.data.venues as Array<any>;
        console.log(`✓ Found ${venues.length} venue(s)`);
        venues.forEach((venue: any) => {
            console.log(`  - ${venue.name} (Capacity: ${venue.capacity || 'N/A'})`);
            if (venue.city && venue.state) {
                console.log(`    ${venue.city}, ${venue.state}`);
            }
        });
        console.log();
    } else if (venuesResult.errors) {
        console.log(`✗ Error: ${venuesResult.errors[0].message}\n`);
    }

    // Test 6: Promo codes (requires admin/manager auth)
    console.log('Test 6: List Promo Codes (requires auth)');
    const promoCodesQuery = `
    query {
      promoCodes {
        id
        code
        type
        amount
        uses
      }
    }
  `;

    const promoCodesResult = await query(promoCodesQuery);
    if (promoCodesResult.data) {
        const promoCodes = promoCodesResult.data.promoCodes as Array<any>;
        console.log(`✓ Found ${promoCodes.length} promo code(s)`);
        promoCodes.forEach((promo: any) => {
            console.log(`  - ${promo.code}: ${promo.type} $${promo.amount} (${promo.uses || '∞'} uses)`);
        });
        console.log();
    } else if (promoCodesResult.errors) {
        console.log(`✗ Error: ${promoCodesResult.errors[0].message}`);
        console.log(`  (This may require authentication)\n`);
    }

    console.log('📊 Test Summary:');
    console.log('- Server health: ✓');
    console.log('- Events query: ' + (eventsResult.data ? '✓' : '✗'));
    console.log('- Event groups query: ' + (eventGroupsResult.data ? '✓' : '✗'));
    console.log('- Venues query: ' + (venuesResult.data ? '✓' : '✗'));
}

runTests().catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
});
