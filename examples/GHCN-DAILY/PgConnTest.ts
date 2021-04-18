import { Client } from "https://deno.land/x/postgres/mod.ts";

const client = new Client({
  user: 'ghcn',
  password: 'Strange67',
  database: "ghcn",
  hostname: "204.2.195.225",
  port:  21954,
});
await client.connect().then(() => console.log('connected') )
let result = await client.queryObject("SELECT * FROM PEOPLE")
console.log(result.rows)

let sqlStmt = `INSERT INTO Measure VALUES ( nextval('MEASURE_id_seq'), 'ACW00011604', 17.11667, -61.78333, 10.1, 'ST JOHNS COOLIDGE FIELD', 'AC', 4 ) RETURNING ID`
console.log(sqlStmt)
result = await client.queryObject( sqlStmt )
console.log( result )

await client.end().then(() => console.log('dis-connected') )
