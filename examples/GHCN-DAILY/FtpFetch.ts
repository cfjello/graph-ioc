import { ctrl, Action, action } from "../../cxctrl/mod.ts"
import { CxIterator } from "../../cxstore/mod.ts"
import FTPClient from "https://deno.land/x/ftpc@v1.1.0/mod.ts"
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import { existsSync } from "https://deno.land/std/fs/mod.ts"
import { CxError, _  } from "../../cxutil/mod.ts"
import { config } from "./config.ts"
import { FtpFetchObjectType } from "./interfaces.ts"
import { Client } from "https://deno.land/x/postgres/mod.ts";
// import { ConnectionPool }  from "./PgConnPool.ts"

const __filename = new URL('', import.meta.url).pathname;

@action({
    state: {} as FtpFetchObjectType,
    name: 'FtpFetch',
    init: false
})
export class FtpFetch extends Action<FtpFetchObjectType> {
     // private conn =   ConnectionPool.getInstance() 
    
     private ftpClient?: FTPClient 

    constructor() { super() }

    getClient(): Client {
        return  new Client({
            user: config.dbConf.user,
            password: config.dbConf.password,
            database: config.dbConf.database,
            hostname: config.dbConf.hostname,
            port:  config.dbConf.port,
        })
    }

    async getConnection( retries: number = 2) {
        let success = false 
        this.ftpClient = new FTPClient(config.ftpConf.server)
        while ( ! success && retries > 0 ) {
            try {
                await this.ftpClient.connect()
                success = true

            }
            catch (err) {
                console.warn(err)
                retries--
            }
        }
    }
    
    async main(): Promise<boolean> {   
        let client = this.getClient()
        try {
            await client.connect()
            // console.log(`RUNNING ${ _.isUndefined(this.meta.swarmName!) ? this.meta.name : this.meta.swarmName }`)
            if ( ! this.isSwarmMaster() ) {     
                await this.getConnection()
                try {  
                    // let dir = path.dirname(config.ftpConf.directory)
                    // await ftpClient.chdir( dir) 
                    let counter = 1
                    let itor: CxIterator<FtpFetchObjectType[],FtpFetchObjectType> 
                    // console.log(`Into TRY: ${ _.isUndefined(this.meta.swarmName!) ? this.meta.name : this.meta.swarmName }`)
                    itor = ctrl.getIterator<FtpFetchObjectType[],FtpFetchObjectType>('FtpFetch', 'FtpList', this.getJobId(), true ) as CxIterator<FtpFetchObjectType[],FtpFetchObjectType>  
                    let obj: IteratorResult<any>
                    while ( itor && (obj = itor.next() )  &&  ! obj.done ) {
                        let filePath = obj.value[1].ftpPath + obj.value[1].fileName
                        //
                        // Check if the file is already in the database
                        // 
                        let lookup = await client.queryObject(`SELECT filepath from load_list WHERE filepath = '${filePath}'`)
                        //
                        // Check if file is already in staging area
                        //
                        let fileName = path.basename(filePath)
                        let storePath = path.resolve( config.staging.stageDir + '/files/' + fileName )
                        let fileExists = existsSync(filePath)
                        if ( lookup.rows.length === 0 ) { // && ! fileExists 
                            this.state = obj.value[1]
                            let data: Uint8Array
                            let ftpSuccess = false 
                            let retries = 5 
                            while ( ! ftpSuccess && retries > 0 ) {
                                try { 
                                    this.state.fileInfo = await this.ftpClient!.stat( filePath )
                                    console.log(`Download: ${filePath} --> ${storePath}`)
                                    data = await this.ftpClient!.download( filePath )
                                    ftpSuccess = true
                                    if ( ! _.isUndefined(data!) ) {
                                        Deno.writeTextFileSync(storePath, new TextDecoder().decode(data!))
                                        await client.queryObject(`INSERT INTO load_list VALUES ( DEFAULT, '${filePath}', NULL, NULL, FALSE )`)
                                        this.state.status = true
                                        this.publish()
                                    }
                                    else {
                                        throw new CxError( __filename, 'ftpFetch.main()', 'FTP-0004',`Failure, probably due to closed ftp connection`)
                                    }
                                }
                                catch(err) {
                                    await this.getConnection()
                                    retries--
                                }
                            }
                            if ( counter % 100  === 0 ) {
                                await this.ftpClient?.close()
                                await this.getConnection()
                            }
                            counter++
                        }
                        // else {
                        //     console.log(`Skipping ${filePath}`)
                        // }
                    } 
                }
                catch ( err ) {
                    throw new CxError( __filename, 'ftpFetch.main()', 'FTP-0002',`FtpFetch main(): ${JSON.stringify(err)}`, err)
                }
                finally {
                    this.ftpClient?.close()
                    client.end()
                }
            }
        }
        catch( err) {
            throw new CxError( __filename, 'ftpFetch.main()', 'FTP-0003',`FtpFetch failed with: ${JSON.stringify(err)}`, err)
        }
        finally {
            client.end()
        }
    return Promise.resolve(true)
    }
}