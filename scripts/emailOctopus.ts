import fetch from 'node-fetch';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';

const ENDPOINT = 'https://graph.codeday.org/'
const QUERY = `
query FetchAttendeesInSeason($eventGroupId: String!) {
  clear {
    tickets(where: { event: { is: { eventGroupId: { equals: $eventGroupId } } } }) {
      firstName
      lastName
      email
      type
      event { name region { name } }
      guardian { firstName lastName email}
    }
  }
}
`;
interface TicketType {
  firstName: string
  lastName: string
  email?: string
  type: string
  event: {
    name: string
    region: { name: string }
  }
  guardian?: { firstName: string, lastName: string, email?: string }
}
interface Record {
    ['First Name']: string
    ['Last Name']: string
    ['Email']?: string
    ['Program']: string
    ['Type']: string
    ['Region']: string
    ['Season']: string
    ['School Year']: string
    ['Experience Level']: string
}

const TOKEN = process.argv[2];
const EVENT_GROUP_ID = process.argv[3];
const SEASON_NAME = process.argv[4];
const SCHOOL_YEAR = process.argv[5];

async function exportCsv() {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Clear-Authorization': `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { eventGroupId: EVENT_GROUP_ID },
    }),
  });
  const resp = await res.json();
  if (resp.errors) console.error(resp.errors);

  const entries: Record[] = resp.data.clear.tickets.map((t: TicketType) => ({
    ['First Name']: t.firstName,
    ['Last Name']: t.lastName,
    ['Email']: t.email,
    ['Program']: 'CodeDay',
    ['Type']: t.type[0].toUpperCase() + t.type.slice(1).toLowerCase(),
    ['Region']: t.event.region.name,
    ['Season']: SEASON_NAME,
    ['School Year']: SCHOOL_YEAR,
    ['Experience Level']: 'Beginner',
  }));

  const parentEntries: Record[] = resp.data.clear.tickets.filter((t: TicketType) => t.guardian).map((t: TicketType) => ({
    ['First Name']: t.guardian!.firstName,
    ['Last Name']: t.guardian!.lastName,
    ['Email']: t.guardian!.email,
    ['Program']: 'CodeDay',
    ['Type']: 'Parent',
    ['Region']: t.event.region.name,
    ['Season']: SEASON_NAME,
    ['School Year']: SCHOOL_YEAR,
    ['Experience Level']: 'Beginner',
  }));

  const all = [...entries, ...parentEntries].filter((e) => e.Email);

  const result = stringify(all, {
    header: false,
  });

  fs.writeFileSync('/tmp/attendees.csv', result);
  console.log('Saved to /tmp/attendees.csv');
}

exportCsv();
