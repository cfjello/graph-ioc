import { CxError  } from '../mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'
import isUndefined  from "https://raw.githubusercontent.com/lodash/lodash/master/isUndefined.js"
import { $logDir  } from '../mod.ts'
import * as path from "https://deno.land/std/path/mod.ts"

const __filename = new URL('', import.meta.url).pathname;
// export const __dirname = path.dirname( path.fromFileUrl(new URL('.', import.meta.url)) )


Deno.test( { 
    name: 'CxError can register a fault', 
    fn: async () => {
        try {
            throw Error('Unprovoked Error') 
        }
        catch( err ) {
            let cxErr = new CxError(__filename , 'fn()', 'TEST-0001', 'fn() failed', err)
            expect(cxErr.message).toEqual('fn() failed')
            expect(cxErr.errChain[0].message).toEqual('Unprovoked Error')
            // if ( ! isUndefined( cxErr.stack) ) console.log(cxErr.stack)
            expect(cxErr.errChain[0].stack!).toMatch(/at Object.fn/m)
        }
    },
    sanitizeResources: false,
    sanitizeOps: false
})

Deno.test( { 
    name: 'CxError can CHAIN multiple faults', 
    fn: async () => {
        try {
            try {
                try {
                    throw Error('Base JS Error')
                }
                catch( err1 ) {
                    throw new CxError(__filename , 'fn()', 'TEST-0001', 'fn() first', err1)
                }
            }
            catch( err2 ) {
                throw new CxError(__filename , 'fn()', 'TEST-0002', 'fn() second', err2)
            }
        }
        catch( err3 ) {
            let outerErr = new CxError(__filename , 'fn()', 'TEST-0003', 'fn() third', err3)
            
            expect(outerErr.code).toEqual('TEST-0003')
            expect(outerErr.message).toEqual('fn() third')
            expect(outerErr.stack!).toMatch(/at Object.fn/m)
       
            let messages = ['Base JS Error' , 'fn() first', 'fn() second']
            let length = outerErr.errChain.length
            for (let i = 0 ; i < 3; i++ ) {
                expect(outerErr.errChain[i].message).toEqual( messages[i] )
            }
            outerErr.logError()
        }
    },
    sanitizeResources: false,
    sanitizeOps: false
})
