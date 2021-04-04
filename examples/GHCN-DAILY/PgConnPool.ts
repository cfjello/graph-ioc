import { Pool } from "https://deno.land/x/postgres/mod.ts";
import { PoolClient } from "https://deno.land/x/postgres/client.ts";
export { PoolClient }
import { config } from "./config.ts"
import { ConfigType, ConnPoolConfigType } from "./interfaces.ts"

const POOL_CONNECTIONS = config.dbConf.POOL_CONNECTIONS;
import { CxError } from "../../cxutil/mod.ts"
import { _ } from "../../cxutil/mod.ts"


const __filename = new URL('', import.meta.url).pathname;

export class ConnectionPool {
    private static instance: ConnectionPool 
    static dbPool: Pool
    static connCount: number = 0

    private constructor( conf: ConfigType = config ) { 
        ConnectionPool.dbPool = new Pool( conf.dbConf, conf.dbConf.POOL_CONNECTIONS );
    }

    static getInstance(conf: ConfigType = config) {
        if ( ! ConnectionPool.instance ) {
            ConnectionPool.instance = new ConnectionPool( conf )
        }
        return ConnectionPool.instance
    }
        
    async runSql(query: string) {
        try {
            const client: any = await ConnectionPool.dbPool.connect();
            const dbResult = await client.queryObject(query);
            client.release();
            return dbResult;
        }
        catch(err) {
            throw new CxError( __filename, 'runSql', 'PGPOOL-00005',`Failed to SQL statement: '${query}'`, err)
        }
    }

    async getConn(): Promise<PoolClient>{
        try {
            let conn = await ConnectionPool.dbPool.connect()
            ConnectionPool.connCount++
            return Promise.resolve(conn as unknown as PoolClient)
        }
        catch(err) {
            throw new CxError( __filename, 'runSql', 'PGPOOL-00003',`Failed to get database connection from connection pool`, err)
        }
    }

    async endConn( client: PoolClient ): Promise<void> {
        try {
            client.release()
        }
        catch(err) {
            throw new CxError( __filename, 'runSql', 'PGPOOL-00004',`Unable to release client within the connection pool`, err)
        }
    }
}