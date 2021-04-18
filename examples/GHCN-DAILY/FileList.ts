import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import { Action, action } from "../../cxctrl/mod.ts"
import { CxError, _  } from "../../cxutil/mod.ts"
import { config } from "./config.ts"
import { Client } from "https://deno.land/x/postgres/mod.ts";

const __filename = new URL('', import.meta.url).pathname;
export const __dirname = path.dirname( path.fromFileUrl(new URL('.', import.meta.url)) )

@action({
    state: [] as string[],
    init: false
})
export class FileList extends Action<string[]> {

    getClient(): Client {
        return  new Client({
            user: config.dbConf.user,
            password: config.dbConf.password,
            database: config.dbConf.database,
            hostname: config.dbConf.hostname,
            port:  config.dbConf.port,
        })
    }

    async main (): Promise<boolean> {
        let self = this
        let counter = 0 
        let client = this.getClient()  
        try {
            await client.connect()  
            for await (const dirEntry of Deno.readDir( config.staging.textFiles ) ) {
                if (dirEntry.isFile) {
                    // await client.queryObject( `INSERT INTO load_list VALUES ( DEFAULT, '${dirEntry.name}', NULL, NULL, FALSE )` )
                    this.state.push(dirEntry.name); 
                }
 
            }

            for await (const dirEntry of Deno.readDir( config.staging.files ) ) {
                if (dirEntry.isFile) {
                    // await client.queryObject( `INSERT INTO load_list VALUES ( DEFAULT, '${dirEntry.name}', NULL, NULL, FALSE )` )
                    this.state.push(dirEntry.name); 
                }
            } 
            
            let inserts: string[] = []
            let i = 0
            for ( ; i < this.state.length; i++ ) {
                inserts.push( `( DEFAULT, '${this.state[i]}', NULL, NULL, FALSE )` )
                if ( i % 200 === 0 ) {
                    await client.queryObject( 'INSERT INTO load_list VALUES ' + inserts.join(',') ) 
                    inserts = []
                }
            }
            if ( i % 200 !== 0 ) {
                await client.queryObject( 'INSERT INTO load_list VALUES ' + inserts.join(',') ) 
            }
        }
        catch( err) {
            throw new CxError( __filename, 'FileList', 'FILE-0001',`FileList.main() failed.`, err)
        }
        finally {
            this.publish()
            client.end()
        }
        
        return Promise.resolve(true)
    }
}