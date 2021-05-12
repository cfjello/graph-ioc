import { ctrl, Action, action, swarm , iterate } from "../../cxctrl/mod.ts"
import { CxIterator } from "../../cxstore/mod.ts"
import { StoreEntry } from "../../cxstore/interfaces.ts"
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import FTPClient from "https://deno.land/x/ftpc@v1.1.0/mod.ts"
import { CxError, _ , ee } from "../../cxutil/mod.ts"
import { expect } from 'https://deno.land/x/expect/mod.ts'

const __filename = new URL('', import.meta.url).pathname

@action({
    state: [] as string[],
    init: false
})
export class FileList extends Action<string[]> {
    runs: number = 0
    main (): Promise<boolean> {
        try {
            for ( let i = 0; i < 1000; i++ )   {
                this.state.push( `run_${this.runs}_${i}`)
            }
            this.publish()
        }
        catch( err) {
            throw new CxError( __filename, 'FileList', 'TEST-0001',`fileList.main() failed.`, err)
        }
        return Promise.resolve(true)
    }
}


@action({
    state: [] as string[],
})
export class FileAppend extends Action<string[]> {
    
    async main(): Promise<boolean> {   
        console.log(`RUNNING ${ _.isUndefined(this.swarm.swarmName!) ? this.meta.name : this.swarm.swarmName }`)
        try {
            let itor: CxIterator<string[], string> 
            itor = iterate.getIterator<string[],string>('FileAppend', 'FileList', this.getJobId(), true ) as CxIterator<string[],string> 
            let obj: IteratorResult<any>
            while ( itor && (obj = itor.next() )  &&  ! obj.done ) {
                let fileName = obj.value[1] as string
                this.state.push(`${fileName}_killroy_was_here`) 
                this.publish()
            } 
        }
        catch ( err ) {
            throw new CxError( __filename, 'FileAppend.main()', 'TEST-0002',`main(): ${JSON.stringify(err)}`, err)
        }
    return Promise.resolve(true)
    }
}

let fileList = await new FileList().register()
let fileAppend = await new FileAppend().register()

swarm.setSwarmConf('FileAppend', 3, 3)
await fileAppend.setDependencies('FileList')
await swarm.addSwarm('FileAppend', FileAppend )

await fileAppend.run()


Deno.test( {
    name: '07 - Root FileList and Swarm copies has the correct variables set', 
    fn: async () => {
        expect( ctrl.store.has('FileList') ).toBeTruthy()
        expect ( fileAppend.swarm.swarmLsnr).toBeUndefined()
        // expect( fileAppend.swarm.swarName ).toEqual(fileAppend.meta.name) // TODO: check what is appropriate 
        expect( fileAppend.swarm.children.length ).toEqual(3)
        expect( fileAppend.swarm.canRun).toBeTruthy()
        expect( fileAppend.swarm.isMaster()).toBeTruthy()
        fileAppend.swarm.children.forEach( (value: string, index: number) => {
            let sObj = ctrl.actions.get(value)!
            expect( sObj.meta.name ).toEqual(fileAppend.meta.name)
            expect( fileAppend.swarm.swarName ).not.toEqual(fileAppend.meta.name)
            expect( sObj.swarm.children ).toBeUndefined()
            expect ( sObj.swarm.swarmLsnr).toBeDefined()
            expect( sObj.swarm.canRun).toBeTruthy()
            expect( sObj.swarm.isMaster()).toBeFalsy()
        })
        expect( (ctrl.getStateData('FileList', -1) as string[]).length ).toBeGreaterThan(999) 
    },
    sanitizeResources: false,
    sanitizeOps: false
})

Deno.test( {
    name: '07 - Root FileList can toggle the Swarm copies run state', 
    fn: async () => {
        fileAppend.swarm.children.forEach( async (value: string, index: number) => {
            let sObj = ctrl.actions.get(value)!
            let msg = `${sObj.swarm.swarmName}_msg`
            expect( sObj.swarm.canRun).toBeTruthy()
            try {
                // console.log( `EventName: ${msg}`)
                await ee.emit(msg, 'stop')
                // expect( sObj.swarm.canRun).toBeFalsy()
                await ee.emit(msg, 'Run')
                // expect( sObj.swarm.canRun).toBeTruthy()
            }
            catch( err ) { console.log(err)}
            
        })
        expect( (ctrl.getStateData('FileList', -1) as string[]).length ).toBeGreaterThan(999) 
    },
    sanitizeResources: false,
    sanitizeOps: false
})

Deno.test( {
    name: '07 - FileList has created a partioned file list', 
    fn: async () => {
        expect( ctrl.store.has('FileList') ).toBeTruthy()
        expect( (ctrl.getStateData('FileList', -1) as string[]).length ).toBeGreaterThan(999) 
    },
    sanitizeResources: false,
    sanitizeOps: false
})

Deno.test( {
    name: '07 - FileAppend has appended to FileList', 
    fn: async () => {
        expect( ctrl.store.has('FileAppend') ).toBeTruthy()
        expect( (ctrl.getStateData('FileAppend', -1) as string[]) ).toBeDefined()
        let itorL = iterate.getIterator<string[],string>('FileAppend', 'FileList', fileList.getJobId(), true )
        let countL = itorL?.entryCounter
        let iter = iterate.getIterator<string[],string>('FileAppend', 'FileAppend', fileAppend.getJobId() )
        let count = 0
        let obj: any
        while ( iter && (obj = iter.next() )  &&  ! obj.done ) {
            count++
        }
        expect( count).toEqual(countL)
    },
    sanitizeResources: false,
    sanitizeOps: false
})