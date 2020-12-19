import { $plog } from './CxLog.ts' 
import  merge from "https://raw.githubusercontent.com/lodash/lodash/master/merge.js"
import  ShortUniqueId  from 'https://cdn.jsdelivr.net/npm/short-unique-id@latest/short_uuid/mod.ts';
import { ActionDescriptor} from "../cxctrl/ActionDescriptor.ts"
import { CxError } from "./mod.ts"

export type  PerfMeasureType = { 
    type: string,
    action: string,
    token: string, 
    transaction?: number, 
    start: number, 
    end: number | undefined, 
    ms: number | undefined
}

// export type PerfMeasure = PerfMeasureType & ( ActionDescriptor | {} )

/**
 * Perf Class - Simple performance Monitoring class that can be instanciated using 
 * the logging function of your choice, e.g. console or Bunyan
 */
class Perf<P> {
    perf = new Map<string, PerfMeasureType & P>()
    private _enabled: boolean = false
    /**
     * Gets enabled
     */
    public get enabled(): boolean {
        return this._enabled;
    }

    /**
     * Sets enabled - if set to false the performance measurements are disabled
     */
    public set enabled(value: boolean) {
        this._enabled = value;
    }

    /**
     * Creates an instance of perf.
     * @param logger The looging function, e.g. Deno logger
     * @param logLevel The log level as defined by the logger added, example 'info' or 'warn' 
     */
    constructor( private logger: any, private logLevel: string ) {
        this.enabled = true
    }

    /**
     * Marks the Start of a time measurement the first time it is called 
     * and when called the second time, the end of a performance measurement.
     * It then creates a performance record and logs it using the Logger function provided in the Perf class constructor
     * 
     * When the mark function for a given name/token for a measurement is called a third and fourth time (and so on) 
     * it produces and logs a new measument - internally it overwrites the previous measurement of the same name, 
     * assuming that it has already been logged - this optimized space usage.  
     * @param token Name of the measurement 
     * @param [desc] Optional additional description parameters can be added in this object
     */
    mark( token: string, desc: P = {} as P ) {
        if ( this.enabled ) {
            if ( ! this.perf.has(token) || this.perf.get(token)!.end !== undefined ) {
                let perfRec: PerfMeasureType & P  = merge ( { 
                    type:  'perf',
                    token: token, 
                    start: performance.now(), 
                    end:   undefined ,
                    ms:    undefined  
                }, desc )
                this.perf.set(token, perfRec) 
            }
            else if ( this.perf.has(token) ) {
                let entry: PerfMeasureType & P = this.perf.get(token)!
                entry.end = performance.now() 
                entry.ms = ( entry.end === undefined ? 0 : entry.end - entry.start )
                let logEntry: PerfMeasureType & P = merge(entry, desc)
                $plog.info( logEntry as unknown )
                // this.perf.delete(token)
            }
            else {
                throw new CxError('Cxperf.ts', 'mark()', 'PERF-0001', `Performance token ${token} does not exist`)
            }
        }
    }

    /**
     * Gets time for a named performce measurement
     * @param token The name of the performance measurement
     * @returns  A performance descriptor object
     */
    get( token: string ): PerfMeasureType & P {
        try {
            return this.perf.get(token)!
        }
        catch (err) {
            throw new CxError('Cxperf.ts', 'get()', 'PERF-0001', `Performance token ${token} does not exist`, err)
        }
        
    }

    /**
     * Logs a measurement using the logger and a given or default log level
     * @param token he name of the performance measurement
     * @param [level] The log level (if not provided, it default to the logLevel given in the constructor)
     */
    async logMeasure( token: string ) {
        let entry: PerfMeasureType & P = this.perf.get(token)!
        entry.ms = ( entry.end === undefined ? 0 : entry.end - entry.start )
        $plog.info( entry as unknown )
    }
    
    
    //['perfFile'].flush();

    /**
     * Lists the whole current active perf map to the log file
     */
    listPerfMap() {
        this.perf.forEach( (value, token)  => {
            this.logMeasure(token)
        })
    }
}

/**
*   Provides a Perf instance using the logger and can be imported accross various modules in a project  
*/
const processUuid = new ShortUniqueId() // unique process identifier 
export let perf = new Perf<ActionDescriptor>( $plog, 'INFO' )