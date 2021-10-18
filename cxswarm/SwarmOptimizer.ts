import { action, Action } from "../cxctrl/mod.ts"
import * as swarm  from "./Swarm.ts"
import { ee, CxError, _ } from "../cxutil/mod.ts"
import { SwarmConfiguration, Advice , OptimizerType } from "./interfaces.ts"
import EventEmitter from "https://raw.githubusercontent.com/denolibs/event_emitter/master/lib/mod.ts";
const __filename = new URL('', import.meta.url).pathname

@action ({
    init:   false,
    intern: true,
    state:  {} as OptimizerType,
    ctrl: 'optimize'
}) 
export class SwarmOptimizer extends Action<OptimizerType> {
    self = this   
    // config: SwarmConfiguration  
    intervalTimer:    number  = performance.now()
    init: boolean =   false
    

    constructor( _config: Partial<SwarmConfiguration>, public swarmMasterName: string ) {
        super( _.merge ( swarm.swarmConfigDefaults( _config ) , {
            buffer:     [],
            rewards:    [],
            advices:    []
        }))
    }

    get(): OptimizerType | undefined {
        return this.state
    }

    getAdvice(): Advice {
        try {
            let advices = this.state.advices
            return advices[advices.length -1]
        }
        catch(err) {
            throw new CxError(__filename, 'getAdvice',  'OPTI-0001', `Requested Advice:  ${this.meta.name} - does not exist.`, err) 
        } 
    }

    optimize() {
        let s = this.state
        // let adviceResult = {}
        try {
            let last            = s.rewards.length - 1
            let prevAdv         = s.advices.length - 1
            let diff: number    = last > 0 ? s.rewards[last].value - s.rewards[last -1].value : 0
            let reward: number  = s.rewards[last].value

            if ( s.approach === 'binary' ) {
                if ( prevAdv < 0  ) { // Initial state
                    let advice  =  s.minimum + Math.round( ( s.maximum - s.minimum ) / 2 )
                    s.advices.push( { done:false, advice: advice, reward: reward } ) 
                }
                else if ( ! s.advices[prevAdv].done ) {
                    if ( diff > 0 ) { // We continue upwards
                        let advice  = s.advices[prevAdv].advice + Math.round( ( s.maximum - s.advices[prevAdv].advice ) / 2 )
                        let done = advice !==  s.advices[prevAdv].advice ? false : true
                        if ( done ) 
                            s.advices[prevAdv].done = true
                        else 
                            s.advices.push( { done: done, advice: advice, reward: reward } )
                    }
                    else { // Or we go down instead
                        let lowerBound =  prevAdv > 1 ? s.advices[prevAdv-1].advice : s.minimum
                        let advice = s.advices[prevAdv].advice - Math.round( ( s.advices[prevAdv].advice - lowerBound ) / 2 )
                        let done = advice <=  s.advices[prevAdv].advice ? true : false
                        if ( done ) 
                            s.advices[prevAdv].done = true
                        else 
                            s.advices.push( { done: done, advice: advice, reward: reward } )
                    }
                }
            }
            else if ( s.approach === 'interval' ) {
                if ( prevAdv < 0 ) { // Initial state
                    let advice  =  s.minimum + s.interval!
                    if ( advice <= s.maximum )  {
                        s.advices.push( { done:false, advice: advice, reward: reward } )
                    }
                    else {
                        s.advices.push( { done: true, advice: s.maximum, reward: reward } )
                    }
                }
                else if ( ! s.advices[prevAdv].done ) { 
                    if ( diff > 0 ) { // We continue upwards
                        let adviceValue  =  s.advices[prevAdv].advice + s.interval!
                        let advice = adviceValue < s.maximum ? adviceValue : s.maximum
                        let done = advice !==  s.advices[prevAdv].advice ? false : true
                        if ( done ) 
                            s.advices[prevAdv].done = true
                        else 
                            s.advices.push( { done: done, advice: advice, reward: reward } )
                    }
                    else { // We go down instead
                        let adviceValue = s.advices[prevAdv].advice - s.interval!
                        let advice = adviceValue > s.minimum ? adviceValue : s.minimum
                        let done = advice !==  s.advices[prevAdv].advice ? false : true
                        if ( done ) 
                            s.advices[prevAdv].done = true
                        else 
                            s.advices.push( { done: done, advice: advice, reward: reward } )
                    }
                }
            }
        }
        catch(err) {
            throw new CxError(__filename, 'run',  'OPTI-0002', `Failed to run optimizer`, err)
        }
    }

    reward( value: number, name: string = 'swarm' ) { 
        let s = this.state
        console.log( `Into Reward: ${value}`)
        try {
                let ts = performance.now()
                if ( s.buffer.length === 0 ) {
                    s.rewards.push( { ts: ts, value: 0 } )
                }
                s.buffer.push(value)
                let bufferLen = s.buffer.length
                let len = s.rewards.length
                if ( len > 0 && ( performance.now() - s.rewards[len-1]!.ts ) > s.timerMS! ) {
                    // Sum up the buffer
                    const reducer = (accumulator: number, currentValue: number) => accumulator + currentValue
                    const reward =  s.buffer.reduce(reducer) 
                    console.log( `Calculated Reward: ${reward}`)
                    s.rewards.push( { ts: ts, value: reward } )
                    if ( s.rewards.length > s.skipFirst! ) {
                        this.optimize()
                        this.publish()
                        // Reset the buffer for next run
                        s.buffer = s.buffer.splice(0, bufferLen)
                        // Notify the swarm master
                        ee.emit( `${this.swarmMasterName}_advice`, name )
                    }
                }
        }
        catch ( err ) {
            throw new CxError(__filename, 'reward()', 'OPTI-0003', `Failed to add reward measure.`, err)
        }
    }
}
