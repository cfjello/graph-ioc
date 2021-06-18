import { action, Action } from "../../cxctrl/mod.ts"
import { LoadListType } from "./interfaces.ts"
import { config } from "./config.ts"
import { Client } from "https://deno.land/x/postgres/mod.ts";
import { _, CxError} from "../../cxutil/mod.ts"

const __filename = new URL('', import.meta.url).pathname;

@action({
    state: [] as LoadListType[],
    ctrl: 'doQuery'
})
export class LoadList extends Action<LoadListType[]> {
    client: Client 
    connected: boolean = false
    limit: number
    offset: number
    counter: number = 0
    constructor( limit: number = 600, offset: number = 0  ) {
        super()
        this.limit = limit
        this.offset = offset
        this.client = this.getClient()
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
        try {
            // if ( ! this.connected ) {
                await this.client.connect()
                // this.connected = true
            // }
            this.offset = (this.counter * this.limit)
            console.log(`OFFSET: ${this.offset}`) 
            const result = await this.client.queryObject(`SELECT id, filepath, started, ended, success FROM load_list WHERE started IS NULL ORDER BY id LIMIT ${this.limit}`)
            this.state = result.rows as LoadListType[]
            this.counter++
            this.publish()
        }
        catch(err) {
            throw new CxError( __filename, 'doQuery()', 'LOAD-0010',`SQL Query to fetch next file items array failed.`, err)
        }
        finally {
            this.client.end()
        }
    }
}