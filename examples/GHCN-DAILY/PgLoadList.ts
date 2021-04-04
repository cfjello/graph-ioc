import { action, Action } from "../../cxctrl/mod.ts"
import { LoadListType } from "./interfaces.ts"
// import { ConnectionPool }  from "./PgConnPool.ts"
// import { pgManager, PgClient } from "./PgManager.ts"
import { config } from "./config.ts"
import { Client } from "https://deno.land/x/postgres/mod.ts";
import { _, CxError} from "../../cxutil/mod.ts"

const __filename = new URL('', import.meta.url).pathname;

@action({
    state: [] as LoadListType[],
    ctrl: 'doQuery'
})
export class LoadList extends Action<LoadListType[]> {
    // private conn = pgManager.getClient()
    limit: number
    readonly offset: number
    counter: number = 0
    constructor( limit: number = 10000, offset: number = 0  ) {
        super()
        this.limit = limit
        this.offset = offset
    }

    getClient(): Client {
        return  new Client({
            user: config.dbConf.user,
            password: config.dbConf.password,
            database: config.dbConf.database,
            hostname: config.dbConf.hostname,
            port:  config.dbConf.port,
        })
    }
    
    async doQuery() {
        console.log('Running LoadList.doQuery()')
        let client = this.getClient()
        await client.connect()
        try {
            let offset = this.offset + (this.counter * this.limit) 
            console.log(`OFFSET: ${offset}`)
            const result = await client.queryObject(`SELECT id, filepath, started, ended, success FROM load_list WHERE started IS NULL ORDER BY id LIMIT ${this.limit} OFFSET ${offset}`);
            this.state = result.rows as LoadListType[]
            this.publish()
            /*
            if ( result.rows.length > 0 ) {
                this.counter++
                this.state = []
                result.rows.forEach( ( row, idx ) => {
                    this.state.push(_.mapValues(_.keyBy(row, 'name'), 'value') as LoadListType)
                })

                console.log(`PUBLISHED: ${result.rows.length}`)
            }
            */ 
        }
        catch(err) {
            throw new CxError( __filename, 'doQuery()', 'LOAD-0010',`SQL Query to fetch next file items array failed.`, err)
        }
        finally {
            client.end()
        }
    }
}