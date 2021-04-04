import { Client } from "https://deno.land/x/postgres/mod.ts";

const client = new Client({
  user: 'ghcn',
  password: 'Strange67',
  database: "ghcn",
  hostname: "204.2.195.225",
  port:  21954,
});
await client.connect().then(() => console.log('connected') )
const result = await client.queryObject("SELECT * FROM PEOPLE")
console.log(result.rows)

await client.end().then(() => console.log('dis-connected') )
