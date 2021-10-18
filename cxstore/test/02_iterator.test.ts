import { ctrl, Action, action } from "../../cxctrl/mod.ts"
import { CxIterator, CxContinuous } from "../mod.ts"
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
            let ftpClient = new FTPClient(this.server) 
            await ftpClient.connect()
            await ftpClient.chdir(this.directory)
            let fileList = await ftpClient.list()

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
        }
        catch( err) {
            throw new CxError( __filename, 'FtpList', 'FTP-0001',`ftpList.main() failed.`, err)
        }
        return Promise.resolve(true)
    }
}


@action({
    state: [] as FtpFetchObjectType[],
    init: false
})
export class FtpList3 extends Action<FtpFetchObjectType[]> {
    constructor( 
        public server: string = config.ftpConf.server, 
        public directory: string = config.ftpConf.directory) {
        super()
    }
    async main (): Promise<boolean> {
        let self = this
        self.state = []
        try {
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
                if ( idx > 0 && idx % 17 === 0 ) {
                    this.publish()
                    self.state = []
                }
            })
            ftpClient.close()
            this.publish()
            let list = this.getState(self.meta.name!, -1) as FtpFetchObjectType[] 
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
        },
        sanitizeResources: false,
        sanitizeOps: false
    })


    let itor = new CxIterator({ 
        storeKey: 'Fetch01', 
        indexKey: ftpFetch.currActionDesc.jobId 
    })
     
    Deno.test({
        name: '02 - CxIterator: Iterator should have been created', 
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
        name: '02 - CxIterator: Iterator should read the store object using next()', 
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
    let itor2 = new CxIterator<FtpFetchObjectType[],FtpFetchObjectType>( {
        storeKey: 'Fetch02', 
        indexKey: ftpFetch2.currActionDesc.jobId 
    })


    Deno.test( {
        name: '02 - StoreIterator: getEntries() should return all entries object that supports next()', 
        fn: async () => {
            let storeObj  = itor2.next() as IteratorResult<FtpFetchObjectType[]> // Fetch the first published object
            let entries = CxIterator.getEntries<FtpFetchObjectType>( storeObj )
            if ( ! _.isUndefined( entries ) ) {
                let done = false
                while ( ! done ) {
                    let obj = entries!.next() as IteratorResult<FtpFetchObjectType> 

                    done = obj.done as boolean
                    if ( ! done ) {
                        let value: FtpFetchObjectType  = obj.value[1]
                        expect(value.ftpServer).toBeDefined()
                        expect(value.ftpPath).toBeDefined()
                        expect(value.fileName.length ).toBeGreaterThan(10) 
                    }
                }
            }
        },
        sanitizeResources: false,
        sanitizeOps: false
    })
 
}


{
    let ftpFetch3 = await new FtpList3().register('Fetch03')
    await ftpFetch3.main()
    let itor3 = new CxIterator<FtpFetchObjectType[],FtpFetchObjectType>( {
        storeKey: 'Fetch03', 
        indexKey: ftpFetch3.currActionDesc.jobId, 
        nestedIterator: true 
    })


    Deno.test( {
        name: '02 - StoreIterator: getEntries() should return all entries objects that supports next()', 
        fn: async () => {
            let inObjEntry  = itor3.next() as IteratorResult<FtpFetchObjectType> // Fetch the first published object
            let done = false
            while ( ! done ) {
                inObjEntry  = itor3.next() as IteratorResult<FtpFetchObjectType>
                done = inObjEntry.done as boolean
                if ( ! done ) {
                    let value   = inObjEntry.value[1]
                    expect(value.ftpServer).toBeDefined()
                    expect(value.ftpPath).toBeDefined()
                    expect(value.fileName.length ).toBeGreaterThan(10) 
                }
            }
            return
        },
        sanitizeResources: false,
        sanitizeOps: false
    })
}

@action({
    state: [] as number[],
    init: false
})
export class NumList extends Action<number[]> {
    counter: number = 0

    main() {
        let s: number[] = []
        if ( this.counter < 100 ) {
            for ( let i = 1; i < 11; i++ ) {
                this.counter += 1
                s.push(this.counter)
            }
            this.state = _.clone(s)
            this.publish()
        }
    }
}

{
    let numList = await new NumList().register()

    await numList.run()
    Deno.test({
        name: '02 - CxContinuous: Test object for CONTINUOUS should be fully initialized', 
        fn: async () => {
            let nl = ctrl.store.get<number[]>('NumList') as number[]
            expect(nl).toBeDefined()
            expect ((nl as number[]).length).toEqual(10)
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

    let itor4 = new CxContinuous<number[]>( {
        storeKey: 'NumList', 
        indexKey: numList.currActionDesc.jobId,
        nestedIterator: true
    })
    Deno.test({
        name: '02 - CxContinuous: Iterator should read a CONTINUOUS store object using next()', 
        fn: async () => {
            let done = false
            let count = 1
            while ( ! done  ) {
                let obj = await itor4.next() as IteratorResult<number> 
                done = obj.done as boolean
                if ( ! done ) {
                    let value: number  = obj.value[1]
                    expect(value).toEqual(count++)
                }
            }
            expect(count).toEqual(101)
        },
        sanitizeResources: false,
        sanitizeOps: false
    })
}

{
    let numList2 = await new NumList().register('NumList2')

    let itor5 = new CxContinuous<number[]>( {
        storeKey: 'NumList2', 
        indexKey: -1,
        nestedIterator: true
    })
    Deno.test({
        name: '02 - CxContinuous: Iterator should read a CONTINUOUS with no jobId supplied', 
        fn: async () => {
            let done = false
            let count = 1
            while ( ! done  ) {
                let obj = await itor5.next() as IteratorResult<number> 
                done = obj.done as boolean
                if ( ! done ) {
                    let value: number  = obj.value[1]
                    expect(value).toEqual(count++)
                }
            }
            expect(count).toEqual(101)
        },
        sanitizeResources: false,
        sanitizeOps: false
    })
}

{
    let numList3 = await new NumList().register('NumList3')

    await numList3.run()

    let itor6 = new CxContinuous<number[]>( {
        storeKey: 'NumList3', 
        indexKey: -1,
        nestedIterator: true
    })
    Deno.test({
        name: '02 - CxContinuous: Iterator should read a CONTINUOUS with pre-existing publish and no jobId supplied', 
        fn: async () => {
            let done = false
            let count = 1
            while ( ! done  ) {
                let obj = await itor6.next() as IteratorResult<number> 
                done = obj.done as boolean
                if ( ! done ) {
                    let value: number  = obj.value[1]
                    expect(value).toEqual(count++)
                }
            }
            expect(count).toEqual(101)
        },
        sanitizeResources: false,
        sanitizeOps: false
    })
}

{
    let numList4 = await new NumList().register('NumList4')

    await numList4.run()

    let itor7 = new CxContinuous<number[]>( {
        storeKey: 'NumList4', 
        indexKey: -1,
        nestedIterator: true
    })
    Deno.test({
        name: '02 - CxContinuous: Iterator should read a CONTINUOUS, next( done = true) will stop the loop', 
        fn: async () => {
            let done = false
            let count = 1
            while ( true ) {
                let obj = await itor7.next(done) as IteratorResult<number> 
                if ( ! done ) {
                    let value: number  = obj.value[1]
                    expect(value).toEqual(count++)
                }
                done = done = obj.done as boolean || count > 10 ? true : false
                if ( done ) break
            }
            expect(count).toEqual(11)
        },
        sanitizeResources: false,
        sanitizeOps: false
    })
}