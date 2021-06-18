import { ctrl, Action }  from '../cxctrl/mod.ts'
import {$log, perf, ee, CxError, _ } from "../cxutil/mod.ts"
import { swarmConfigDefaults } from "./Swarm.ts"
import {  SwarmConfiguration, Approach, Advice , OptimizerType } from "./interfaces.ts"
const __filename = new URL('', import.meta.url).pathname

export class SwarmOptimizer {
    /*
    * Configuration
    */
    protected config: SwarmConfiguration
    optimizers:       OptimizerType[]    = []
    intervalTimer:    number             = performance.now()

    constructor( _config: Partial<SwarmConfiguration>, public masterObj: Action<any> ) {
        this.config = swarmConfigDefaults(_config)
        if ( this.config.approach != 'none' ) this.set( this.config )
    }

    get( optimizerName:  string = 'swarm' ): OptimizerType | undefined {
        try {
            let idx = _.findIndex( this.optimizers, (obj: OptimizerType) => { return obj.name === optimizerName } )
            return this.optimizers[idx]
        }
        catch(err) {
            throw new CxError(__filename, 'get',  'OPTI-0001', `Requested optimizer:  ${optimizerName} - does not exist.`, err) 
        }   
    }

    //
    // The optimizer takes the optimizerGroup of the first thing you want to optimize
    //
    set(  conf: SwarmConfiguration ) 
    {
        let optimizer: OptimizerType = _.merge ( conf, {
            buffer:     [],
            rewards:    [],
            advices:    [],
            callback:   undefined
        })
        this.optimizers.push(optimizer)
    }

    _optimize( name: string = 'swarm' ) {
        if ( this.optimizers.length > 0 ) {
            try {
                let optimizer = this.get(name)!
                let last = optimizer.rewards.length > 0 ? optimizer.rewards.length - 1 : 0
                let prev = last > 0  ? last -1 : 0
                let diff: number = optimizer.rewards[last].value - optimizer.rewards[prev].value

                if ( optimizer.approach === 'binary' ) {
                    if ( last === 0 ) { // Initial state
                        let advice  =  Math.round(( this.config.maximum - this.config.minimum ) / 2 ) 
                        optimizer.advices[last] = { done:false, advice: advice }
                    }
                    else if ( diff < 2 ) {
                        // TODO: If more than one optimization target, then check for better outcomes elsewhere, since we could be at a local optimum
                        optimizer.advices[last] =  { done: true, advice: optimizer.advices[prev].advice }
                    }
                    else if ( diff >= 2 ) { // We continue upwards
                        let advice  =  Math.round( ( this.config.maximum - optimizer.advices[prev].advice ) / 2 )
                        optimizer.advices[last] = { done:false, advice: advice }
                    }
                    else { // We go down instead
                        let lowerBound =  last === 1   ? this.config.minimum : optimizer.advices[prev].advice
                        let advice = Math.round(( optimizer.advices[prev].advice - lowerBound ) / 2 )
                        optimizer.advices[last] =  { done:false, advice: advice }
                    }
                    optimizer.callback( optimizer.advices[last] )
                }
                else if ( optimizer.approach === 'interval' ) {
                    if ( last === 0 ) { // Initial state
                        let advice  =  this.config.minimum + optimizer.interval!
                        optimizer.advices[last] = { done:false, advice: advice }
                    }
                    else if ( diff < optimizer.interval! ) {
                        // TODO: If more than one optimization target, then check for better outcomes elsewhere, since we could be at a local optimum
                        optimizer.advices[last] =  { done: true, advice: optimizer.advices[prev].advice }
                    }
                    else if ( diff >= optimizer.interval! ) { // We continue upwards
                        let adviceValue  =  optimizer.advices[prev].advice + optimizer.interval!
                        adviceValue = adviceValue < optimizer.maximum ? adviceValue : optimizer.maximum
                        optimizer.advices[last] = { done:false, advice: adviceValue }
                    }
                    else { // We go down instead
                        let adviceValue = optimizer.advices[prev].advice - optimizer.interval!
                        adviceValue = adviceValue > optimizer.minimum ? adviceValue : optimizer.minimum
                        optimizer.advices[last] =  { done:false, advice: adviceValue }
                    }
                    optimizer.callback( optimizer.advices[last] )
                }
            }
            catch(err) {
                throw new CxError(__filename, 'run',  'OPTI-0002', `Failed to run optimizer ${name}`, err)
            }
        }
    }

    optimize(): void {
        try {
            // Figure out what to optimize in this run 
            let nextOptimizeKey = this.optimizers[0].name
            let len = this.optimizers[0].advices.length
            this.optimizers.every( (value:OptimizerType, idx: number ) => {
                if ( idx > 0 && value.advices.length < len ) {
                    len  =  value.advices.length
                    nextOptimizeKey = value.name
                    return false;
                } 
                return true                
            })
            this._optimize(nextOptimizeKey) 
        }
        catch(err) {
            throw new CxError(__filename, 'optimize',  'OPTI-0003', `Failed to find any optimizer.`, err)
        }
    }

    reward( value: number, name = 'swarm' ) { 
        try {
            let optimizer = this.get(name)!
            if ( optimizer ) {
                let ts = performance.now()
                if ( optimizer.buffer.length === 0 ) {
                    optimizer.rewards.push( { ts: ts, value: 0 } )
                }
                optimizer.buffer.push(value)
                let len = optimizer.rewards.length
                if ( len > 0 && ( performance.now() - optimizer.rewards[len]!.ts ) > this.config.timerInterval! ) {
                    // Sum up the buffer
                    const reducer = (accumulator: number, currentValue: number) => accumulator + currentValue
                    const reward =  optimizer.buffer.reduce(reducer) 
                    optimizer.rewards.push( { ts: ts, value: reward } )
                    if ( optimizer.rewards.length > optimizer.skipFirst! ) {
                        this.optimize()
                    }
                }
            }
        }
        catch ( err ) {
            throw new CxError(__filename, 'reward()', 'OPTI-0004', `Failed to add reward measure.`, err)
        }
    }


}