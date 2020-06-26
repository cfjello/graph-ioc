import { perf }    from './mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'
import { delay }   from "https://deno.land/std/async/delay.ts"

/*
function sleeper(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
*/ 

Deno.test('Performance: It should mark and log a measurement',  async ()  => {
    perf.mark('T1') 
    await delay(1000)
    perf.mark('T1')
    let measure = perf.getPerfRec('T1')
    expect( measure ).toBeDefined()
    expect( measure.token).toEqual('T1')
    expect( measure.ms ).toBeGreaterThan(1000)
})
