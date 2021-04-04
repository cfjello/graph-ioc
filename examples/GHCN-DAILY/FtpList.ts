import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import { Action, action } from "../../cxctrl/mod.ts"
import FTPClient from "https://deno.land/x/ftpc@v1.1.0/mod.ts"

import { CxError, _  } from "../../cxutil/mod.ts"
import { config } from "./config.ts"
import { FtpFetchObjectType } from "./interfaces.ts"
import { tables } from "./PgTables.ts"

const __filename = new URL('', import.meta.url).pathname;
export const __dirname = path.dirname( path.fromFileUrl(new URL('.', import.meta.url)) )

@action({
    state: [] as FtpFetchObjectType[],
    name: 'FtpList',
    init: false
})
export class FtpList extends Action<FtpFetchObjectType[]> {
    // private conn =   ConnectionPool.getInstance() 

    constructor( 
        public server: string = config.ftpConf.server, 
        public directory: string = config.ftpConf.directory,
        // public fileName:  string | undefined = undefined 
        ) {
        super()
    }
    async main (): Promise<boolean> {
        let self = this
        try {
            let ftpClient = new FTPClient(this.server) 
            await ftpClient.connect()
            await ftpClient.chdir(this.directory)
            let fileList: FtpFetchObjectType[] = []

            for ( let [key, val] of tables ) {
                let isFile = ( val.file ?? "" ).endsWith('.txt')
                
                if ( ! isFile ) {
                    await ftpClient.chdir(val.file)
                    let list = await ftpClient.list()
                    list.forEach( name => {
                        fileList.push(  {
                            ftpServer:  self.server,
                            ftpPath:    self.directory + val.file + '/',
                            fileName:   name
                        })
                    })
                }
                else {
                    try {
                        let fileInfo = await ftpClient.stat(val.file)
                        fileList.push( {
                            ftpServer:  self.server,
                            ftpPath:    self.directory,
                            fileName:   val.file
                        })
                    }
                    catch(err) {
                        throw new CxError( __filename, 'FtpList', 'FTP-0002',`File does not exist.`, err)
                    }
                }

            }
            ftpClient.close()
            self.state = fileList 
            this.publish()
            
            let filePath = path.resolve(__dirname + '/GHCN-DAILY/resources/ftplist.json')
            // console.log(filePath)
            Deno.writeTextFileSync( filePath, JSON.stringify(self.state) )
        }
        catch( err) {
            throw new CxError( __filename, 'FtpList', 'FTP-0001',`ftpList.main() failed.`, err)
        }
        return Promise.resolve(true)
    }
}


let ftpList = await new FtpList('ftp.ncdc.noaa.gov', 'pub/data/ghcn/daily/').register()

ftpList.main()