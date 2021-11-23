import { action, Action, ctrl } from "../cxctrl/mod.ts"
import * as swarm  from "./Swarm.ts"
import { ee, CxError, _, $olog, Mutex } from "../cxutil/mod.ts"
import { SwarmConfiguration, Advice } from "./interfaces.ts"
import { StoreEntry } from "../cxstore/mod.ts";

const __filename = new URL('', import.meta.url).pathname

@action ({
    init:   true,
    intern: true,
    state:  {} as Advice,
    ctrl: 'optimize'
}) 
export class SwarmOptimizer extends Action<Advice> {
    self        = this   
    buffer      = [] as number[]
    timerCnt    = 0
    prevTS      = 0    
    calculating = false

    constructor( 
        _conf: Partial<SwarmConfiguration>, 
        public swarmMasterName: string, 
        public conf: SwarmConfiguration = swarm.swarmConfigDefaults( _conf )  
    ) {
        super({
            name:    conf.name,
            advice:  -1, 
            reward:  -1 ,
            ts: performance.now() - (conf.timerMS! + 10),
            done:    false,
            handled: true
        })
        this.prevTS = Math.round(performance.now() - (conf.timerMS! + 10)) 
    }

    get(): Advice | undefined {
        return this.state
    }


    getCurrAdvice(): Advice {
        try {
            return ctrl.getStateData(this.meta.name!)
        }
        catch(err) {
            throw new CxError(__filename, 'getAdvice',  'OPTI-0001', `Requested Advice:  ${this.meta.name} - does not exist.`, err) 
        } 
    }

    optimize(reward: number) {
        // let s = this.state
        try {
            let mapRef: Map<number, StoreEntry<Advice>> = ctrl.getMapRef(this.meta!.name!)
            let handled: Advice[]      = []
            mapRef.forEach( ( entry ) => { if (entry.data.handled) handled.push(entry.data) } )
            let prevHandled: Advice[]  = handled.reverse() ?? []

            // swarm.sbug('mapRef size: %d, handled.length: %d', mapRef.size, handled.length)
            let prev         = prevHandled[0]

            let diff: number = reward - prev.reward
            if (this.conf.approach === 'binary' ) {
                if ( prev.advice < 0  ) { // Initial state
                    this.update(
                        {
                            advice:  this.conf.minimum + Math.round( ( this.conf.maximum - this.conf.minimum ) / 2 ),
                            done:    false,
                            handled: false
                        }
                    )
                }
                else if ( ! prev.done ) {
                    if ( diff > 0 ) { // We continue upwards 
                        let advice = prev.advice + Math.round( ( this.conf.maximum - prev.advice ) / 2 )
                        let done   = advice !==  prev.advice ? false : true
                        this.update( 
                            {
                                advice:  advice,
                                done:    done,
                                handled: false
                            }
                        )
                    }
                    else { // Or we go down instead
                        let i = 1
                        let lowerBound  = this.conf.minimum

                        for ( ; i < prevHandled.length && prevHandled[i].advice  > prev.advice; i++ ) {}
                        if ( i < prevHandled.length ) lowerBound = prevHandled[i].advice

                        let advice = prev.advice - Math.round( ( prev.advice - lowerBound ) / 2 )
                        swarm.sbug('Binary DOWN Advice %d from prev.advice: %d and lowerBound: %d' , advice,  prev.advice, lowerBound )
                        let done = advice !==  prev.advice ? false : true
                        this.update( 
                            {
                                advice:  advice,
                                done:    done,
                                handled: false
                            }
                        )
                    }
                    swarm.sbug('Binary Reward: %d Advice %d' , this.state.reward, this.state.advice )
                }
            }
            else if ( this.conf.approach === 'interval' ) {
                if ( prev.advice < 0 ) { // Initial state
                    this.update(
                        {
                            advice:  this.conf.minimum + this.conf.interval!,
                            done:    false,
                            handled: false
                        }
                    )
                }
                else if ( ! prev.done ) { 
                    if ( diff > 0 ) { // We continue upwards
                        let adviceValue  =  prev.advice + this.conf.interval!
                        let advice = adviceValue < this.conf.maximum ? adviceValue : this.conf.maximum
                        let done = advice !==  prev.advice ? false : true
                        this.update( 
                            {
                                advice:  advice,
                                done:    done,
                                handled: false
                            }
                        )
                    }
                    else { // We go down instead, but only in step  interval
                        let i = 1
                        let lowerBound  = this.conf.minimum

                        for ( ; i < prevHandled.length && prevHandled[i].advice  > prev.advice; i++ ) {}
                        if ( i < prevHandled.length ) lowerBound = prevHandled[i].advice
                       
                        let advice = lowerBound > this.conf.minimum ? lowerBound : this.conf.minimum
                        let done = advice !==  prev.advice ? false : true
                        this.update( 
                            {
                                advice:  advice,
                                done:    done,
                                handled: false
                            }
                        )
                    }
                    swarm.sbug('Interval Reward: %d Advice %d' , this.state.reward, this.state.advice )
                }
            }
        }
        catch(err) {
            throw new CxError(__filename, 'run',  'OPTI-0002', `Failed to run optimizer`, err)
        }
    }

    async reward( value: number ) { 
        let s = this.state
        try {
            // swarm.sbug(`R_1`)
            let prev = this.getCurrAdvice()
            let now = Math.round(performance.now())
            let prevTS: number

            if ( this.timerCnt === 0 ) {
                prevTS = 0 
            }

            if ( ( now - this.prevTS ) > this.conf.timerMS! && ! this.calculating ) {
                this.buffer.push(value)
                let bufferLen = this.buffer.length
                if ( prev.handled &&  this.conf.skipFirst! < this.timerCnt && ! this.calculating ) {
                    try {    
                        // swarm.sbug(`R_3`)
                        this.calculating = true
                        //
                        // Sum up the buffer
                        //
                        const reducer = (accumulator: number, currentValue: number) => accumulator + currentValue
                        // swarm.sbug(`R_4`)
                        const reward  =  this.buffer.slice(0,bufferLen).reduce(reducer) 
                        s.reward =  reward
                        this.optimize(reward)
                        swarm.sbug(`ADVICE: ${JSON.stringify(s)}`)
                        let oName = ( this as Action<Advice>).meta.name
                        $olog.info( { name: oName, type: 'advice', value: s} )
                        if ( s.advice  !== prev.advice ) {
                            s.ts = now
                            this.publish()
                            ee.emit( `${this.swarmMasterName}_advice`, oName, `${this.swarmMasterName}`, _.clone(s) )
                        }
                      
                    }
                    catch(err) { 
                        throw Error(`Failed to handle reward`) 
                    }
                    finally {
                        // Reset the buffer for next run
                        this.buffer.splice(0, bufferLen)         
                        this.calculating = false
                    }
                }
                this.timerCnt++
                this.prevTS = Math.round(performance.now())
            }
            else {
                this.buffer.push(value)
            }
        }
        catch ( err ) {
            throw new CxError(__filename, 'reward()', 'OPTI-0003', `Failed to add reward measure.`, err)
        }
    }
}
