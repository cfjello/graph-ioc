import { ctrl, Action, action, swarm , iterate} from "../../cxctrl/mod.ts"
import { Advice } from "../interfaces.ts"
import { CxIterator } from "../../cxstore/mod.ts"
// import { StoreEntry } from "../../cxstore/interfaces.ts"
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import FTPClient from "https://deno.land/x/ftpc@v1.1.0/mod.ts"
import { CxError, _ , ee } from "../../cxutil/mod.ts"
import { delay } from 'https://deno.land/x/delay/mod.ts'
import { expect } from 'https://deno.land/x/expect/mod.ts'

const __filename = new URL('', import.meta.url).pathname

type ST = { runName: string }

@action({
    state: [] as string[],
    init: false
})
export class FileList extends Action<string[]> {
    runs: number = 0

    main (): Promise<boolean> {
        this.state = [] as string[]
        try {
            for ( let i = 0; i < 1000; i++ )   {
                // let obj: ST = { runrunName: `${this.runs}_${i}` as string }
                this.state.push( `${this.runs}_${i}` as string )
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
    state:  [] as string[],
})
export class FileAppend extends Action<string[]> {
    
    async main(): Promise<boolean> {   
        this.state = [] as string[]
        try {
            let itor: CxIterator<string[], string> 
            itor = iterate.getIterator<string[],string>('FileAppend', 'FileList', this.getJobId(), true ) as CxIterator<string[],string> 
            let obj: IteratorResult<any>
            while ( itor && (obj = itor.next() )  &&  ! obj.done ) {
                let val = obj.value[1].runName as string
                this.state.push( `${val}_kilroy_was_here` as string  ) 
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

swarm.swarmConfig('FileAppend', 3, 3)
await fileAppend.setDependencies('FileList')
await swarm.addSwarm('FileAppend', FileAppend )

await fileAppend.run()

Deno.test( {
    name: '08 - Root FileList and Swarm copies has the correct variables set', 
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
            expect( sObj.swarm!.children.length ).toEqual(0)
            expect ( sObj.swarm!.swarmLsnr).toBeDefined()
            expect( sObj.swarm!.canRun).toBeTruthy()
            expect( sObj.isMaster()).toBeFalsy()
        })
        expect( (ctrl.getStateData('FileList', -1) as string[]).length ).toBeGreaterThan(999) 
    },
    sanitizeResources: false,
    sanitizeOps: false
})

Deno.test( {
    name: '08 - FileList has created a partioned file list', 
    fn: async () => {
        expect( ctrl.store.has('FileList') ).toBeTruthy()
        expect( (ctrl.getStateData('FileList', -1) as string[]).length ).toBeGreaterThan(999) 
    },
    sanitizeResources: false,
    sanitizeOps: false
})

Deno.test( {
    name: '08 - FileAppend has appended to FileList', 
    fn: async () => {
        expect( ctrl.store.has('FileAppend') ).toBeTruthy()
        expect( (ctrl.getStateData('FileAppend', -1) as string[]) ).toBeDefined()
        let itorL = iterate.getIterator<string[],string>('FileAppend', 'FileList', fileList.getJobId(), true )
        let countL = itorL!.entryCounter
        let iter = iterate.getIterator<string[],string>('FileAppend', 'FileAppend', fileAppend.getJobId() )
        let count = -1
        let obj: any
        while ( iter && (obj = iter.next() )  &&  ! obj.done ) {
            count++
        }
        expect( count).toEqual(countL)
    },
    sanitizeResources: false,
    sanitizeOps: false
})



@action({
    state:  [] as string[],
})
export class FileAppend2 extends Action<string[]> {
    
    async main(): Promise<boolean> {   
        this.state = [] as string[]
        console.log(`RUNNING ${ _.isUndefined(this.swarm!.swarmName!) ? this.meta.name : this.swarm!.swarmName }`)
        try {
            let itor: CxIterator<string[], string> 
            itor = iterate.getIterator<string[],string>('FA1', 'FileList', this.getJobId(), true ) as CxIterator<string[],string> 
            let obj: IteratorResult<any>
            let idx = 0
            while ( this.swarm && this.swarm.canRun && itor && (obj = itor.next() )  &&  ! obj.done ) {
                let val = obj.value[1].runName as string
                this.state.push( `${val}_kilroy_was_here` as string  ) 
                this.publish()
                // ee.emit( `${this.meta.name}_reward`, { })
                await delay(200) 
                if ( ++idx > 20 ) break;
            } 
        }
        catch ( err ) {
            throw new CxError( __filename, 'FileAppend.main()', 'TEST-0002',`main(): ${JSON.stringify(err)}`, err)
        }
        finally {
            if ( this.swarm ) this.swarm.canBeDisposed = true
        }
    return Promise.resolve(true)
    }
}

let fileAppend2 = await new FileAppend2().register()

await fileAppend2.setDependencies('FileList')

/*
fileAppend.optimizeCallback( advice: Advice) {

}
*/ 

swarm.setSwarmConfig('FileAppend2', {
    maximum: 20,
    minimum: 10,
    skipFirst: 1,
    approach: 'binary',
    timerInterval: 1000
} )
await swarm.addSwarm('FileAppend2', FileAppend2 )
await fileAppend2.run()


Deno.test( {
    name: '08 - Swarm Master receives Reward measurements', 
    fn: async () => {
        for ( let i = 0 ; i < 10 ; i++ ) {
            await delay( 220 )
            let rewards = fileAppend2.swarm.optimizer.get('swarm').rewards
            expect( rewards.length ).toBeGreaterThan(0) 
            expect( rewards[i] ).toBeGreaterThan(0) 
        }
    },
    sanitizeResources: false,
    sanitizeOps: false
})


/*
Deno.test( {
    name: '08 - Swarm Master receives Reward measurements', 
    fn: async () => {
        for ( let i = 0 ; i < 20 ; i++ ) {
            await delay( 1010 )
            expect( fileAppend2.optimizer.rewards[i] ).toBeGreaterThan(0) 
        }
    },
    sanitizeResources: false,
    sanitizeOps: false
})
*/ 
/*
Deno.test( {
    name: '08 - Swarm Master receives Reward measurements', 
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
*/
