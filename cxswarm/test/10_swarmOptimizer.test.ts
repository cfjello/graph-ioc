import { ctrl, action, iterate } from "../../cxctrl/mod.ts"
import { Action } from "../../cxctrl/Action.ts"
import { swarm } from "../mod.ts"
import { Advice, OptimizerType, SwarmChildType } from "../interfaces.ts"
import { CxIterator } from "../../cxstore/mod.ts"
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
        // console.log(`RUNNING ${ _.isUndefined(this.swarm!.swarmName!) ? this.meta.name : this.swarm!.swarmName }`)
        try {
            let itor: CxIterator<string[], string> 
            itor = iterate.getIterator<string[],string>(this.meta.name!, 'FileList', this.getJobId(), true ) as CxIterator<string[],string> 
            let obj: IteratorResult<any>
            let modus = 1000
            let accum = 0
            let idx = 1
            
            while ( swarmRef.canRun && itor && (obj = itor.next() )  &&  ! obj.done ) {
                let val = obj.value[1].runName as string
                this.state.push( `${val}_kilroy_was_here` as string  ) 
                this.publish()
                if ( ++idx % modus )  {
                    swarmRef.reward(modus, 'swarm')!
                    accum += modus
                    console.log(`Reward: ${modus} from ${this.getName()} for the ${idx} time, total: ${accum}`)
                    await delay(200)
                    modus += 500
                }
                if ( ++idx >= 10 ) break;
            } 
        }
        catch ( err ) {
            throw new CxError( __filename, 'FileAppend.main()', 'TEST-0002',`main(): ${JSON.stringify(err)}`, err)
        }
        finally {
            if ( ! swarmRef.canRun ) swarmRef.canBeDisposed = true
        }
    return Promise.resolve(true)
    }
}

let fileAppend2 = await new FileAppend2().register()

await fileAppend2.setDependencies('FileList')

swarm.setSwarmConfig('FileAppend2', {
    maximum: 50,
    minimum: 10,
    skipFirst: 0,
    approach: 'binary',
    timerMS: 300
} )


await swarm.addSwarm('FileAppend2' )
await swarm.addOptimizer( fileAppend2 )
await fileAppend2.run()


Deno.test( {
    name: '10 - Swarm Master has the Optimizer initialized', 
    fn: async () => {
        try {
            expect( fileAppend2.swarm.optimizers ).toBeDefined() 
            let keys = [ ...fileAppend2.swarm.optimizers.keys() ]
            console.log(`Optimizer keys: ${keys}`)
            expect( fileAppend2.swarm.optimizers.get('FileAppend2_optimize_swarm') ).toBeDefined() 
            let name = fileAppend2.swarm.optimizers.get('FileAppend2_optimize_swarm').meta.name 
            expect( name ).toEqual('FileAppend2_optimize_swarm')
            let internKeys = [ ...ctrl.runState.state.keys()]
            console.log(`Intern store keys: ${internKeys}`)
            expect( ctrl.runState.state.get('FileAppend2_optimize_swarm') ).toBeDefined()
            // let actionKeys = [ ...ctrl.actions.keys()]
            // console.log(`Ctrl action keys: ${actionKeys}`) 
            expect ( ctrl.actions.get('FileAppend2_optimize_swarm') ).toBeInstanceOf(Action)
        }
        catch (err ) { console.log(err) }
    },
    sanitizeResources: false,
    sanitizeOps: false
})
/*
Deno.test( {
    name: '10 - Swarm Master can store rewards', 
    fn: async () => {
        try {
            expect( fileAppend2.swarm.optimizers.get('FileAppend2_optimize_swarm') ).toBeDefined() 
            let name = fileAppend2.swarm.optimizers.get('FileAppend2_optimize_swarm').meta.name 
            expect( name ).toEqual('FileAppend2_optimize_swarm')
            let internKeys = [ ...ctrl.runState.state.keys()]
            console.log(`Intern store keys: ${internKeys}`)
            expect( ctrl.runState.state.get('FileAppend2_optimize_swarm') ).toBeDefined()
            // let actionKeys = [ ...ctrl.actions.keys()]
            // console.log(`Ctrl action keys: ${actionKeys}`) 
            expect ( ctrl.actions.get('FileAppend2_optimize_swarm') ).toBeInstanceOf(Action)
        }
        catch (err ) { console.log(err) }
    },
    sanitizeResources: false,
    sanitizeOps: false
})
*/
Deno.test( {
    name: '10 - Swarm Master receives Reward measurements', 
    fn: async () => {
        let optim: OptimizerType = fileAppend2.swarm.optimizers.get('FileAppend2_swarm')
        expect( ctrl.getStateData('FileAppend2_optimize_swarm') ).toBeDefined()
        let data: OptimizerType = ctrl.getStateData('FileAppend2_optimize_swarm')
        // let data = fileAppend2.__optimizers.get('FileAppend2_optimize_swarm').getState('FileAppend2_optimize_swarm')
        expect( data.rewards ).toBeDefined()
        expect( _.isArray(data.rewards) ).toBeTruthy()
        // expect( data.rewards.length ).toBeGreaterThan(1) 
        /*
        for ( let i = 0 ; i < data.rewards.length  ; i++ ) {
            if ( i == 0 )
                expect( data.rewards[i].value === 0 ).toBeTruthy()
            else
                expect( data.rewards[i].value > 0 ).toBeTruthy()
        }
        */
    },
    sanitizeResources: false,
    sanitizeOps: false
})

/*
Deno.test( {
    name: '10 - Swarm Master optimizer has generated advices using BINARY approch', 
    fn: async () => {
        let optim: OptimizerType = fileAppend2.swarm.optimizer.get('swarm')
        expect( optim ).toBeDefined() 
        expect( optim.advices ).toBeDefined()
        expect( _.isArray(optim.advices) ).toBeTruthy()
        expect( optim.advices.length ).toBeGreaterThan(0) 
        console.log( `${JSON.stringify(optim.advices, undefined, 2)}`)
        for ( let i = 0 ; i < optim.advices.length  ; i++ ) {
            let advice = optim.advices[i].advice
            expect( advice > 0 ).toBeTruthy()
            if ( i > 0 ) 
                expect ( advice > optim.advices[i-1].advice ).toBeTruthy()
        }
    },
    sanitizeResources: false,
    sanitizeOps: false
})

let fileAppend3 = await new FileAppend2().register('FileAppend3')

await fileAppend3.setDependencies('FileList')

swarm.setSwarmConfig('FileAppend3', {
    maximum: 50,
    minimum: 10,
    skipFirst: 0,
    approach: 'interval',
    interval: 5,
    timerMS: 300
} )
await swarm.addSwarm('FileAppend3', FileAppend2 )
await fileAppend3.run()

Deno.test( {
    name: '10 - Swarm Master optimizer has generated advices using INTERVAL approch', 
    fn: async () => {
        let optim: OptimizerType = fileAppend3.swarm.optimizer.get('swarm')
        expect( optim ).toBeDefined() 
        expect( optim.advices ).toBeDefined()
        expect( _.isArray(optim.advices) ).toBeTruthy()
        expect( optim.advices.length ).toBeGreaterThan(0) 
        console.log( `${JSON.stringify(optim.advices, undefined, 2)}`)
        for ( let i = 0 ; i < optim.advices.length  ; i++ ) {
            let advice = optim.advices[i].advice
            expect( advice > 0 ).toBeTruthy()
            if ( i > 0 ) 
                expect ( advice  - 5 ).toEqual( optim.advices[i-1].advice )
        }
    },
    sanitizeResources: false,
    sanitizeOps: false
})

/*
@action({
    state:  [] as string[],
})
export class FileAppend4 extends Action<string[]> {
    
    async main(): Promise<boolean> {   
        this.state = [] as string[]
        // console.log(`RUNNING ${ _.isUndefined(this.swarm!.swarmName!) ? this.meta.name : this.swarm!.swarmName }`)
        try {
            let itor: CxIterator<string[], string> 
            itor = iterate.getIterator<string[],string>('FileAppend4', 'FileList', this.getJobId(), true ) as CxIterator<string[],string> 
            let obj: IteratorResult<any>
            let modus = 100
            let idx = 1
            while ( this.swarm && this.swarm.canRun && itor && (obj = itor.next() )  &&  ! obj.done ) {
                let val = obj.value[1].runName as string
                this.state.push( `${val}_kilroy_was_here` as string  ) 
                this.publish()
                if ( ++idx % modus )  {
                    this.swarm.optimizer?.reward(100)
                    await delay(200)
                    modus += 50
                }
                if ( ++idx >= 20000 ) break;
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

let fileAppend4 = await new FileAppend4().register()

await fileAppend2.setDependencies('FileList')

swarm.setSwarmConfig('FileAppend2', {
    maximum: 50,
    minimum: 10,
    skipFirst: 0,
    approach: 'binary',
    timerInterval: 300
} )
await swarm.addSwarm('FileAppend4', FileAppend4 )
await fileAppend2.run()
*/