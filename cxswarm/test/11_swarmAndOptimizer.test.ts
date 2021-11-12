import { ctrl, action, iterate, bootstrap } from "../../cxctrl/mod.ts"
import { Action } from "../../cxctrl/Action.ts"
import { swarm } from "../mod.ts"
import { SwarmChildType } from "../interfaces.ts"
import { CxIterator } from "../../cxstore/mod.ts"
import { CxError, _ , ee } from "../../cxutil/mod.ts"
import { delay } from 'https://deno.land/std/async/delay.ts'
import { expect } from 'https://deno.land/x/expect/mod.ts'
import { Advice, SwarmMasterType, SwarmOptimizerType } from "file:///C:/Work/graph-ioc/cxswarm/interfaces.ts";
import { StoreEntry } from "file:///C:/Work/graph-ioc/cxstore/interfaces.ts";

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
export class FileAppend2 extends Action<string[]> {
    async main(): Promise<boolean> {  
        let swarmRef = this.swarm as SwarmChildType 
        this.state = [] as string[]
        // 
        try {
            let itor: CxIterator<string[], string> 
            let _swarm = this.swarm as SwarmChildType
            itor = iterate.getIterator<string[],string>(this.meta.name!, 'FileList', this.getJobId(), true ) as CxIterator<string[],string> 
            let obj: IteratorResult<any>
            let modus = 100
            let accum = 0
            let idx = 1
            
            while ( itor && (obj = itor.next(this) )  &&  ! obj.done ) {
                let val = obj.value[1].runName as string
                this.state.push( `${val}_kilroy_was_here` as string  )  
                if ( ++idx % modus )  {
                    swarmRef.reward(modus, 'swarm')!
                    accum += modus
                    modus += 500
                    // await delay(200)
                    this.publish()
                }
                if ( ++idx >= 20000 ) break;
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

let fileAppend2 = await new FileAppend2().register()

await fileAppend2.setDependencies('FileList')

swarm.setSwarmConfig('FileAppend2', {
    maximum: 50,
    minimum: 2,
    skipFirst: 0,
    approach: 'binary',
    timerMS: 1000
} )

await swarm.addSwarm('FileAppend2' )
await swarm.addOptimizer( fileAppend2 )
// await fileAppend2.run()

Deno.test( {
    name: '11.0 - Optimizer has the right configuration', 
    fn: async () => {
        try {
            let optimizer  = fileAppend2.swarm.optimizers.get('FileAppend2_optimize_swarm')
            expect( optimizer.conf.minimum).toEqual(2)
            expect( optimizer.conf.maximum).toEqual(50)
            expect( optimizer.conf.timerMS).toEqual(1000) 
        }
        catch (err ) { console.log(err) }
    },
    sanitizeResources: false,
    sanitizeOps: false
})

Deno.test( {
    name: '11.1 - Swarm Master has the Optimizer initialized', 
    fn: async () => {
        try {
            expect( fileAppend2.swarm.optimizers ).toBeDefined() 
            let keys = [ ...fileAppend2.swarm.optimizers.keys() ]
            expect( fileAppend2.swarm.optimizers.get('FileAppend2_optimize_swarm') ).toBeDefined() 
            let name = fileAppend2.swarm.optimizers.get('FileAppend2_optimize_swarm').meta.name 
            expect( name ).toEqual('FileAppend2_optimize_swarm')
            let internKeys = [ ...ctrl.runState.state.keys()]
            expect( ctrl.runState.state.get('FileAppend2_optimize_swarm') ).toBeDefined()
            expect ( ctrl.actions.get('FileAppend2_optimize_swarm') ).toBeInstanceOf(Action)
        }
        catch (err ) { console.log(err) }
    },
    sanitizeResources: false,
    sanitizeOps: false
})

/*
Deno.test( {
    name: '11.2 - Optimizer can store rewards and give advice', 
    fn: async () => {
        try {
            let optimizer  = fileAppend2.swarm.optimizers.get('FileAppend2_optimize_swarm')
            expect( optimizer.reward ).toBeDefined()
            optimizer.reward(55)
            await delay(1200)
            optimizer.reward(60)
            expect( optimizer.state.reward).toEqual(60)
            await delay(1200)
            let data = ctrl.getStateData('FileAppend2_optimize_swarm')  as Advice
            expect( data.advice).toBeDefined()
            expect( data.advice).toEqual(26)
        }
        catch (err ) { console.log(err) }
    },
    sanitizeResources: false,
    sanitizeOps: false
})
*/


Deno.test( {
    name: '11.4 - SwarmOptimizer swarm callback takes advice and swarm adds new swarm objects', 
    fn: async () => {
        let fileAppend3 = await bootstrap( FileAppend2, { name: 'FileAppend3', init: false, state:  [] as string[] } )
        expect(ctrl.actions.get('FileAppend3') ).toBeDefined()
        fileAppend3.setDependencies('FileList')

        swarm.setSwarmConfig('FileAppend3', {
            maximum: 50,
            minimum: 2,
            skipFirst: 0,
            approach: 'binary',
            timerMS: 1000
        } )
        expect(ctrl.actions.get('FileAppend3') ).toBeDefined()

        await swarm.addSwarm('FileAppend3' )
        await swarm.addOptimizer( fileAppend3 as unknown as  Action<any>)

        expect((fileAppend3.swarm as SwarmOptimizerType).optimizers.has('FileAppend3_optimize_swarm') )
        expect( ctrl.runState.has('FileAppend3_optimize_swarm') ).toBeDefined()
       
        let optimizer  = (fileAppend3.swarm  as SwarmOptimizerType).optimizers.get('FileAppend3_optimize_swarm')!
        optimizer.reward(1000)
        await delay(2000)
        optimizer.reward(2000)
        await delay(3000)
        optimizer.reward(4000)
        await delay(4000)

        let mapRef: Map<number, StoreEntry<Advice>> = ctrl.getMapRef('FileAppend3_optimize_swarm')

        let prevAdvice = -1
        mapRef.forEach( (value, key ) => {
            expect( value.data.advice >= prevAdvice || value.data.done ||  value.data.handled ).toBeTruthy()
            prevAdvice = value.data.advice
        })
    },
    sanitizeResources: false,
    sanitizeOps: false
})

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

