import { ctrl, action,  bootstrap } from "../../cxctrl/mod.ts"
import { Action } from "../../cxctrl/Action.ts"
import { swarm } from "../mod.ts"
import { SwarmChildType } from "../interfaces.ts"
import { iterate, CxIterator } from "../../cxiterate/mod.ts"
import { CxError, _ , ee } from "../../cxutil/mod.ts"
import { delay } from 'https://deno.land/std/async/delay.ts'
import { expect } from 'https://deno.land/x/expect/mod.ts'
import { Advice, SwarmMasterType, SwarmOptimizerType } from "file:///C:/Work/graph-ioc/cxswarm/interfaces.ts";
import { StoreEntry } from "file:///C:/Work/graph-ioc/cxstore/interfaces.ts";
import { assert } from "https://deno.land/std@0.74.0/_util/assert.ts";

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
            for ( let i = 0; i < 30000; i++ )   {
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

let fileList = await new FileList().register()

@action({
    state:  [] as string[],
})
export class FileAppend extends Action<string[]> {
    modus: number = 100;

    async main(): Promise<boolean> {  
        let swarmRef = this.swarm as SwarmChildType 
        this.state = [] as string[]
        // 
        try {
            let itor: CxIterator<string[], string> 
            let _swarm = this.swarm as SwarmChildType

            itor = iterate.getIterator<string[],string>(
                this.meta.name!, 
                'FileList', 
                ctrl.actions.get('FileList')!.getJobId(), 
                true 
            ) as CxIterator<string[],string> 

            let obj: IteratorResult<any>

            let accum = 0
            let idx = 1
            
            while ( itor && (obj = itor.next(this) )  &&  ! obj.done ) {
                let val = obj.value[1].runName as string
                this.state.push( `${val}_kilroy_was_here` as string  )  
                if ( ++idx % this.modus )  {
                    // swarmRef.reward(this.modus, 'swarm')!
                    accum += this.modus
                    // this.modus += 500
                    this.publish()
                    // await delay(2000)
                    break;
                }
            } 
        }
        catch ( err ) {
            throw new CxError( 
                __filename, 
                'FileAppend.main()', 
                'TEST-0002',
                `main(): ${JSON.stringify(err)}`, 
                err
            )
        }
    return Promise.resolve(true)
    }
}

let fileAppend = await new FileAppend().register()
await fileAppend.setDependencies('FileList')

swarm.setSwarmConfig('FileAppend', {
    maximum: 50,
    minimum: 2,
    skipFirst: 0,
    approach: 'binary',
    timerMS: 1000
} )

await swarm.addSwarm('FileAppend' )
await swarm.addOptimizer( fileAppend )
await swarm.addOptimizer( fileAppend, 'modus', ( eventName, actionName ) => {
    let actObj = ctrl.getAction<FileAppend>(actionName)
    swarm.sbug(`Into callback: ${eventName} for ${actionName}`)
    actObj.modus += 50
})
// await fileAppend2.run()

Deno.test( {
    name: '12.1 - Multiple SwarmOptimizers can work together', 
    fn: async () => {
        expect(ctrl.actions.get('FileAppend') ).toBeDefined()
        expect((fileAppend.swarm as SwarmOptimizerType).optimizers.has('FileAppend_optimize_swarm') )
        expect( ctrl.runState.has('FileAppend_optimize_swarm') ).toBeDefined()
        expect((fileAppend.swarm as SwarmOptimizerType).optimizers.has('FileAppend_optimize_modus') )
       
        let optimizer  = (fileAppend.swarm  as SwarmOptimizerType).optimizers.get('FileAppend_optimize_swarm')!
        let optimizer2  = (fileAppend.swarm  as SwarmOptimizerType).optimizers.get('FileAppend_optimize_modus')!
        expect ( optimizer2).toBeDefined()
        expect( fileAppend.swarm.callbacks.has('FileAppend_callback_modus'))
        assert( typeof fileAppend.swarm.callbacks.get('FileAppend_callback_modus') === 'function')
        optimizer.reward(1000).then ( () => {
            let childLen1 = (fileAppend.swarm as SwarmMasterType).children.length
            expect(childLen1).toEqual(26)
        })

       
        optimizer2.reward(2000).then( () => {
            expect(fileAppend.modus).toEqual(150)
        }) //'modus'
        // await delay(2000)

        optimizer.reward(4000).then ( () => {
            let childLen1 = (fileAppend.swarm as SwarmMasterType).children.length
             expect(childLen1).toEqual(38)
        })

        optimizer2.reward(6000).then ( () => { // 'modus'
            expect(fileAppend.modus).toEqual(200)
        })
    },
    sanitizeResources: false,
    sanitizeOps: false
})

/*
Deno.test( {
    name: '11.5 - Swarm can remove swarm objects based on advise', 
    fn: async () => {
        let fileAppend4 = await bootstrap( FileAppend2, { name: 'FileAppend4', init: false, state:  [] as string[] } )
        expect(ctrl.actions.get('FileAppend4') ).toBeDefined()
        fileAppend4.setDependencies('FileList')

        swarm.setSwarmConfig('FileAppend4', {
            maximum: 50,
            minimum: 2,
            skipFirst: 0,
            approach: 'binary',
            timerMS: 1000
        } )
        expect(ctrl.actions.get('FileAppend4') ).toBeDefined()
        await swarm.addSwarm('FileAppend4' )
        await swarm.addOptimizer( fileAppend4 as unknown as  Action<any>)
        // await fileAppend4.run()

        let optimizer  = (fileAppend4.swarm  as SwarmOptimizerType).optimizers.get('FileAppend4_optimize_swarm')!
        optimizer.reward(5000)
        await delay(1200)
        expect( ctrl.runState.has('FileAppend4_optimize_swarm') ).toBeDefined()

        expect(optimizer.getCurrAdvice().advice).toEqual(26)
        let childLen1 = (fileAppend4.swarm as SwarmMasterType).children.length
        expect(childLen1).toEqual(26)

        await delay(5000)
        optimizer.reward(2000)
        await delay(3000)
        expect(optimizer.getCurrAdvice().advice).toEqual(12)
        
        // await delay(3000)
        let childLen2 = (fileAppend4.swarm as SwarmMasterType).children.length
        expect(childLen2).toEqual(12)
    },
    sanitizeResources: false,
    sanitizeOps: false
})
*/