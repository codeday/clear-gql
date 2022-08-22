import fetch from 'node-fetch';

const ENDPOINT = 'https://graph.codeday.org/'
const QUERY = `
query FetchEventsInSeason($eventGroupId: String!) {
  clear {
    events(where: { eventGroupId: { equals: $eventGroupId } } ) {
      id
      region { webname name }
    }
  }
}
`;
interface EventType {
  id: string
  region: { webname: string, name: string }
}

const TOKEN = process.argv[2];
const EVENT_GROUP_ID = process.argv[3];

async function exportJson() {
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

  const entries = resp.data.clear.events.map((e: EventType) => [e.id, { title: e.region?.name, region: e.region?.webname }]);
  console.log(JSON.stringify(Object.fromEntries(entries), null, 2));
}

exportJson();
