import { $log, $logDir  } from './CxLog.ts'
import * as path from "https://deno.land/std/path/mod.ts"
import { expect }  from 'https://deno.land/x/expect/mod.ts'
import { exec, OutputMode } from "https://deno.land/x/exec/mod.ts"
import { delay }   from "https://deno.land/std/async/delay.ts"

// let logger = log.getLogger()
$log.critical("initiating the log testing", 'CxLog', 'CxLog.tst.ts' )
let logFile = path.resolve(`${$logDir}/ctrl/ctrl.log`)

Deno.test( { 
    name: 'Logger functionality: logged message should exist in file', 
    fn: async () => {
        let secsSinceEpoch = ( new Date().getTime() / 1000 ).toString()
        $log.critical(`Secs since epoch: ${secsSinceEpoch}`)
        await delay(1000) 
        const decoder = new TextDecoder("utf-8");
        let content = Deno.readTextFileSync( logFile )
        let regex = new RegExp(`Secs since epoch: ${secsSinceEpoch}`,'m')
        expect(content).toMatch(regex)
    },
    sanitizeResources: false,
    sanitizeOps: false
})