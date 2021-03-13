import { ctrl, Action, action, swarm } from "../../cxctrl/mod.ts"
import { CxIterator } from "../../cxstore/mod.ts"
import { StoreEntry } from "../../cxstore/interfaces.ts"
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import FTPClient from "https://deno.land/x/ftpc@v1.1.0/mod.ts"
import { CxError, _  } from "../../cxutil/mod.ts"
import { expect } from 'https://deno.land/x/expect/mod.ts'

const __filename = new URL('', import.meta.url).pathname;

type FtpFetchObjectType = {
    ftpServer:  string,
    ftpPath:    string,
    fileName:   string,
    fileInfo?:  Deno.FileInfo,
    data?:      Uint8Array,
    status?:    boolean
    info?:      string
}

let  config = {
    ftpConf: {
        server:          'ftp.ncdc.noaa.gov',
        directory:       'pub/data/ghcn/daily/by_year/'
    }
}

@action({
    state: [] as FtpFetchObjectType[],
    name: 'FtpList',
    init: false
})
export class FtpList extends Action<FtpFetchObjectType[]> {
    constructor( 
        public server: string = config.ftpConf.server, 
        public directory: string = config.ftpConf.directory) {
        super()
    }
    async main (): Promise<boolean> {
        let self = this
        try {
            console.log ( `running ${this.meta.name}`)
            let ftpClient = new FTPClient(this.server) 
            await ftpClient.connect()
            await ftpClient.chdir(this.directory)
            let fileList = await ftpClient.list()
            fileList.forEach( async (fileName, idx ) => {
                self.state.push({
                    ftpServer: self.server,
                    ftpPath:  self.directory,
                    fileName: fileName
                })
                if ( idx > 0 && idx % 20 === 0 ) {
                    this.publish()
                    self.state = []
                }
            })
            ftpClient.close()
            this.publish()
        }
        catch( err) {
            throw new CxError( __filename, 'FtpList', 'FTP-0001',`ftpList.main() failed.`, err)
        }
        return Promise.resolve(true)
    }
}

@action({
    state: {} as FtpFetchObjectType,
    name: 'FtpFetch',
    init: false
})
export class FtpFetch extends Action<FtpFetchObjectType> {

    constructor( state?: FtpFetchObjectType) {
        super(state)
    }
    
    async main(): Promise<boolean> {   
        let ftpClient: FTPClient 
        try {
            console.log(`RUNNING ${ _.isUndefined(this.meta.swarmName!) ? this.meta.name : this.meta.swarmName }`)
            // if ( ! this.isSwarmMaster() ) {            
                try {
                    ftpClient = new FTPClient(config.ftpConf.server)  //"ftp.ncdc.noaa.gov"
                    await ftpClient.connect()
                    let dir = path.dirname(config.ftpConf.directory)
                    await ftpClient.chdir( dir) 
    
                    let itor: CxIterator<FtpFetchObjectType[],FtpFetchObjectType> 
                    // console.log(`Into TRY: ${ _.isUndefined(this.meta.swarmName!) ? this.meta.name : this.meta.swarmName }`)
                    itor = ctrl.getIterator<FtpFetchObjectType[],FtpFetchObjectType>('FtpFetch', 'FtpList', this.getJobId(), true ) as CxIterator<FtpFetchObjectType[],FtpFetchObjectType> 
                    let obj: IteratorResult<any>
                    while ( itor && (obj = itor.next() )  &&  ! obj.done ) {
                        let fileName = path.basename((obj.value[1] as any).ftpPath)
                        this.state.fileInfo = await ftpClient.stat(fileName)
                        // this.state.data = await ftpClient.download(fileName)
                        this.state.status = true
                        this.publish()
                    } 
                }
                catch ( err ) {
                    throw new CxError( __filename, 'ftpFetch.main()', 'FTP-0003',`FtpFetch main(): ${JSON.stringify(err)}`, err)
                }
                finally {
                    try { ftpClient!.close() } catch(err) {}
                }
            // }
        }
        catch( err) {
            throw new CxError( __filename, 'ftpFetch.main()', 'FTP-0002',`FtpFetch failed with: ${JSON.stringify(err)}`, err)
        }
        // finally {
        //     console.log(`Finishing ${ _.isUndefined(this.meta.swarmName!) ? this.meta.name : this.meta.swarmName }`)
        // }

    return Promise.resolve(true)
        // return true
    }
}

let ftpList = await new FtpList().register()

let ftpFetch = await new FtpFetch().register()

// ftpList.main()

swarm.setSwarmConf('FtpFetch', 3, 10)
await ftpFetch.setDependencies('FtpList')
await swarm.addSwarm('FtpFetch', FtpFetch )

await ftpFetch.run()

Deno.test( {
    name: '07 - FtpList has created a partioned file list', 
    fn: async () => {
        expect( ctrl.store.has('FtpList') ).toBeTruthy()
        expect( (ctrl.getStateData('FtpList', -1) as FtpFetchObjectType[]).length ).toBeGreaterThan(15) 
    },
    sanitizeResources: false,
    sanitizeOps: false
  })


  Deno.test( {
    name: '07 - FtpFetch has made a stat of each file in FtpList', 
    fn: async () => {
        expect( ctrl.store.has('FtpFetch') ).toBeTruthy()
        expect( (ctrl.getStateData('FtpFetch', -1) as FtpFetchObjectType) ).toBeDefined()
        let itorL = ctrl.getIterator<FtpFetchObjectType[],FtpFetchObjectType>('FtpFetch', 'FtpList', ftpList.getJobId(), true )
        let countL = itorL?.entryCounter
        let itor = ctrl.getIterator<FtpFetchObjectType[],FtpFetchObjectType>('FtpFetch', 'FtpFetch', ftpFetch.getJobId() )
        let count = 0
        let obj: IteratorResult<any>
        while ( itor && (obj = itor.next() )  &&  ! obj.done ) {
            count++
        }
        expect( count).toEqual(countL)
    },
    sanitizeResources: false,
    sanitizeOps: false
  })






