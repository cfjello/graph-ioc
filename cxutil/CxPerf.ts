import { $plog } from './CxLog.ts' 
import  merge from "https://raw.githubusercontent.com/lodash/lodash/master/merge.js"
import  ShortUniqueId  from 'https://cdn.jsdelivr.net/npm/short-unique-id@latest/short_uuid/mod.ts';
import { PerfMeasure, PerfLogRec} from "./interfaces.ts"

/**
 * Perf Class - Simple performance Monitoring class that can be instanciated using 
 * the logging function of your choice, e.g. console or Bunyan
 */
export class Perf {
    perf = new Map<string, PerfMeasure>()
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

    private _suid: string = ''
    public get suid(): string {
        return this._suid;
    }

    public set suid(value: string) {
        this._suid = value;
    }

    /**
     * Creates an instance of perf.
     * @param logger The looging function, e.g. console or Bunyan
     * @param logLevel The log level as defined by the logger added, example 'info' or 'warn' 
     */
    constructor( private logger: any, private logLevel: string, suid: string ) {
        this.enabled = true
        this.suid = suid
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
    mark( token: string, desc: {} = {} ) {
        if ( this.enabled ) {
            if ( ! this.perf.has(token) || this.perf.get(token)!.end !== undefined ) {
                this.perf.set(token, { suid: this.suid, start: performance.now(), end: undefined , desc: JSON.stringify(desc) }  ) 
            }
            else if ( this.perf.has(token) ) {
                // let startTime = this.perf.get(token)!.start
                this.perf.get(token)!.end = performance.now() 
                this.logMeasure(token) // .then( () => {} )
            }
            else {
                throw new Error(`CxPerf.mark() - token ${token} does not exist`)
            }
        }
    }

    /**
     * Gets time for a named performce measurement
     * @param token The name of the performance measurement
     * @returns  A performance descriptor object
     */
    getPerfRec( token: string ): PerfLogRec  {
        let entry = this.perf.get(token)!
        return merge( 
            entry,
            { 
                type: 'perf', 
                token: token,  
                ms:  ( entry.end === undefined ? 0 : entry.end - entry.start ) ,
            })
    }

    /**
     * Logs a measurement using the logger and a given or default log level
     * @param token he name of the performance measurement
     * @param [level] The log level (if not provided, it default to the logLevel given in the constructor)
     */
    async logMeasure( token: string ) {
        let msg = JSON.stringify(this.getPerfRec( token ))
        $plog.info( msg )
    }

    /**
     * Lists the whole current perf map in the log file
     */
    listPerfMap() {
        this.perf.forEach( (value, token)  => {
            this.logMeasure(token)
            let msg = JSON.stringify(this.getPerfRec( token ))
            $plog.info( msg )
        })
    }
}

/**
*   Provides a Perf instance using the Bunyan logger that can be imported accross various modules in a project  
*/
const processUuid = new ShortUniqueId() // unique process identifier 
export let perf = new Perf( $plog, 'info', processUuid() )