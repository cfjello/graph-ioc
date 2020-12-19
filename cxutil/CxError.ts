import { $log } from './mod.ts'
import isUndefined  from "https://raw.githubusercontent.com/lodash/lodash/master/isUndefined.js"
//
// Error Handler
//
interface customErrorIntf  {
    file:       string,
    func:       string,
    code:       string,
    message:    string,
    errChain:   CxError[],
    stack?:     string ,
}

export class CxError implements customErrorIntf  {
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
            if ( ! isUndefined( origErr ) ) {
                if ( (origErr as object).constructor.name === 'Error' ) {
                    // console.log(`origErr: ${JSON.stringify(origErr)}`)
                    origCxErr = new CxError( 'NA', 'NA', 'NA',  origErr!.message, undefined, isUndefined( origErr!.stack ) ? '' : origErr!.stack)
                }
                else {
                    origCxErr = origErr as CxError
                    if ( origCxErr.errChain.length > 0 )  
                        this.errChain = origCxErr.errChain
                    origCxErr.errChain = [] // clear these references
                }
                //
                // Now add the previous error to the errChain 
                //
                this.errChain.push(origCxErr) 
                //
                // If needed transfer the stack, in effect duplicating it
                // 
                if ( isUndefined( this.stack ) && ! isUndefined( origCxErr.stack ) ) {
                    this.stack = origCxErr.stack
                }
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
            callstack:  isUndefined(this.stack) ? "" : this.stack!
        } )
    }
}
