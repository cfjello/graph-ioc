import { $log } from './mod.ts'
import { _ } from '../cxutil/lodash.ts'
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"


export class dirInfo {
    private ___dirname: string = "" // Never used
    public static get __dirname(): string {
        return path.dirname( path.fromFileUrl(new URL('.', import.meta.url)) )
    }

    private ___filename: string = ""  // Never used
    public static get __filename(): string {
        return new URL('', import.meta.url).pathname
    }
}

//
// Error Handler
//
export interface CustomErrorIntf  {
    file:       string,
    func:       string,
    code:       string,
    message:    string,
    errChain:   CxError[],
    stack?:     string ,
}

export class CxError implements CustomErrorIntf  {
    public errChain: CxError[] = [] 
    public file: string = ''
    constructor(
        file:           string,
        public func:    string,
        public code:    string,
        public message: string,
        origErr:        Error | CxError | undefined = undefined,
        public stack:   string | undefined = undefined
         ) {
            this.file = file.replace(/^.*\//,'')  
            //
            // Convert a possible original Error to a CxError
            //
            let origCxErr: CxError
            if ( ! _.isUndefined( origErr ) ) {
                if ( (origErr as object).constructor.name === 'Error' ) {
                    // console.log(`origErr: ${JSON.stringify(origErr)}`)
                    
                   origCxErr = new CxError( 'NA', 'NA', 'NA', JSON.stringify(origErr), undefined, _.isUndefined( origErr!.stack ) ? '' : origErr!.stack)
                }
                else {
                    origCxErr = origErr as CxError
                    if ( ! _.isUndefined(origCxErr.errChain) && origCxErr.errChain.length > 0 )  {
                        this.errChain = origCxErr.errChain
                        origCxErr.errChain = [] // clear these previous references
                    }      
                }
                //
                // Now add the previous error to the errChain 
                //
                this.errChain.push(origCxErr) 
                //
                // If needed transfer the stack, in effect duplicating it
                // 
                if ( _.isUndefined( this.stack ) && ! _.isUndefined( origCxErr.stack ) ) {
                    this.stack = origCxErr.stack
                }
                this.logError()
            }
        }

    logError = async ()  => {
        let messages: string[] = []
        this.errChain.forEach( ( elem, idx) => {
            messages.push(elem.message)
        })
        messages.push( this.message )
        $log.error( {
            file:       this.file,
            funct:      this.func,
            code:       this.code,
            message:    this.message,
            msgStack:   messages,
            callstack:  _.isUndefined(this.stack) ? "" : this.stack!
        } )
    }
}
