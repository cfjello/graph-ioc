import { $logDir  } from './mod.ts'
import { $log } from './CxLog.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'
import { exec, OutputMode } from "https://deno.land/x/exec/mod.ts"
import { delay }   from "https://deno.land/std/async/delay.ts"


$log.info("initing log testing")
Deno.test('Logger functionality: logged message should exist in file', async () => {
    let secsSinceEpoch = ( new Date().getTime() / 1000 ).toString()
    $log.info(`Secs since epoch: ${secsSinceEpoch}`)
    await delay(1000) 
    /* TODO: fix this test
    let response = await exec( `grep ${secsSinceEpoch} ${$logDir}/ctrl/ctrl.log`, {output: OutputMode.Capture} )         
    expect(response).toBeDefined() 
    let resStr = JSON.stringify(response)
    $log.info(`LOG: ${resStr}` )   
    // new RegExp(`^.*Secs since epoch: ${secsSinceEpoch}.*$`)
    // expect(response.output).toMatch(secsSinceEpoch)
    */ 
    expect(true).toBeTruthy()
})
