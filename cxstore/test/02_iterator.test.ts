import { ctrl, Action, action } from "../../cxctrl/mod.ts"
import { StoreIterator } from "../StoreIterator.ts"
import { StoreEntry } from "../interfaces.ts"
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
    state: {} as FtpFetchObjectType,
    init: false
})
export class FtpList extends Action<FtpFetchObjectType> {
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
            ftpClient.close()
            let cnt = 0
            fileList.forEach( async (fileName, idx ) => {
                self.state = {
                    ftpServer: self.server,
                    ftpPath:  self.directory,
                    fileName: fileName
                }
                cnt++
                self.publish()
            })  
            console.log(`LIST COUNT: ${cnt}`)
        }
        catch( err) {
            throw new CxError( __filename, 'FtpList2', 'FTP-0001',`ftpList.main() failed.`, err)
        }
        return Promise.resolve(true)
    }
}

@action({
    state: [] as FtpFetchObjectType[],
    init: false
})
export class FtpList2 extends Action<FtpFetchObjectType[]> {
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
            console.log ( `NEW FILELIST: ${fileList.length}`)

            fileList.forEach( async (fileName, idx ) => {
                self.state[idx] = {
                    ftpServer: self.server,
                    ftpPath:  self.directory,
                    fileName: fileName
                }
            })
            ftpClient.close()
            this.publish()
            let list = this.getState(self.meta.name!, -1) as FtpFetchObjectType[] 
            console.log ( `STORED FILELIST: ${list.length}`)
        }
        catch( err) {
            throw new CxError( __filename, 'FtpList', 'FTP-0001',`ftpList.main() failed.`, err)
        }
        return Promise.resolve(true)
    }
}

{
    let ftpFetch = await new FtpList().register('Fetch01')
    await ftpFetch.main()

    Deno.test({
        name: '02 - Test ftp fetch should fetched the directory list', 
        fn: () => {
            let stateRef = ctrl.store.get('Fetch01', -1 , false) as StoreEntry<FtpFetchObjectType>
            
            expect(stateRef.meta).toBeDefined()
            expect(stateRef.meta.jobId).toBeDefined()
            expect(stateRef.meta.jobId).toEqual( ftpFetch.currActionDesc.jobId )
            expect(ctrl.store.index.get(`J${stateRef.meta.jobId}`)!.get('Fetch01')!.length ).toBeGreaterThan(258)
            
            // expect( obj.value ).toEqual( 'object')
            // expect( ! _.isEmpty(obj.value.fileName.length) ).toBeTruthy()
            // expect( StoreIterator.isIterable( itor ) ).toBeTruthy()
        },
        sanitizeResources: false,
        sanitizeOps: false
    })


    let itor = new StoreIterator('Fetch01', ftpFetch.currActionDesc.jobId, 0 )
     
    Deno.test({
        name: '02 - StoreIterator: Iterator should have been created', 
        fn: () => {
            let obj = itor.next() as IteratorResult<FtpFetchObjectType>
            expect(obj).toBeDefined()
            expect( typeof obj.value ).toEqual( 'object')
            expect(  _.isEmpty(obj.value[1].fileName) ).toBeFalsy()
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

    Deno.test({
        name: '02 - StoreIterator: Iterator should read the store object using next()', 
        fn: () => {
            let done = false
            while ( ! done  ) {
                let obj = itor.next() as IteratorResult<FtpFetchObjectType> 
                done = obj.done as boolean
                if ( ! done ) {
                    let value: FtpFetchObjectType  = obj.value[1]
                    expect(value.ftpServer).toBeDefined()
                    expect(value.ftpPath).toBeDefined()
                    expect(! _.isEmpty(value.fileName) ).toBeTruthy() 
                }
            }
        },
        sanitizeResources: false,
        sanitizeOps: false
    })
}

{
    let ftpFetch2 = await new FtpList2().register('Fetch02')
    await ftpFetch2.main()
    let itor2 = new StoreIterator('Fetch02', ftpFetch2.currActionDesc.jobId, 0 )


    Deno.test( {
        name: '02 - StoreIterator: getEntries() should return all entries object that supports next()', 
        fn: async () => {
            let storeObj  = itor2.next() as IteratorResult<FtpFetchObjectType[]> // Fetch the first published object
            let entries = storeObj.value[1].entries()            // The fetched object is iterable

            // console.log(`VALUE LENGTH: ${storeObj.value.length}`)
        
            let done = false
            while ( ! done ) {
                let obj = entries.next() as IteratorResult<FtpFetchObjectType> 
                // console.log(obj)

                done = obj.done as boolean
                if ( ! done ) {
                    let value: FtpFetchObjectType  = obj.value[1]
                    expect(value.ftpServer).toBeDefined()
                    expect(value.ftpPath).toBeDefined()
                    expect(value.fileName.length ).toEqual(11) 
                }
            }
        },
        sanitizeResources: false,
        sanitizeOps: false
    })
 
}

