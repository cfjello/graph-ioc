import { ctrl, action,bootstrap } from "../../cxctrl/mod.ts"
// import { Action } from "../../cxctrl/Action.ts"
// import { swarm } from "../mod.ts"
import { expect } from 'https://deno.land/x/expect@v0.2.9/mod.ts'
import {SwarmOptimizer } from "../SwarmOptimizer.ts"
import { delay } from 'https://deno.land/std/async/delay.ts'
import { _ } from "../../cxutil/mod.ts"
import { Advice } from "../interfaces.ts";

Deno.test(  {
    name: '10.1 - SwarmOptimizer can take rewards and give advice based on BINARY approach', 
    fn: async () => {
        try {
            let optimizer = await new SwarmOptimizer({
                name: 'swarm',
                maximum: 50,
                minimum: 2,
                skipFirst: 0,
                approach: 'binary',
                timerMS: 1000
            }, 'BinaryTest' ).register(`BinaryTest_optimize_swarm`)

            let entry = ctrl.getStateData('BinaryTest_optimize_swarm')  as Advice          
            expect( entry).toBeDefined() 
            expect( entry.reward ).toEqual(-1) 
            // console.log(`${JSON.stringify(entry)}`)
            let mapEntries = ctrl.getMapRef('BinaryTest_optimize_swarm') 
            expect (mapEntries.size).toEqual(2)

            optimizer.reward(50).then(() => {
                expect ( optimizer.state.reward ).toEqual(50)
                let min = optimizer.conf.minimum
                let max = optimizer.conf.maximum
                expect ( optimizer.state.advice ).toEqual(min + ( max-min)/ 2)
                optimizer.state.handled = true
                optimizer.publish()
            }).then (() => {
                optimizer.reward(55).then( () => {
                    expect ( optimizer.state.reward ).toEqual(55)
                    expect ( optimizer.state.advice ).toEqual(38)
                    optimizer.state.handled = true
                    optimizer.publish()
                    const prev = optimizer.getCurrAdvice()
                    optimizer.reward(25).then (() => {
                    expect ( optimizer.state.reward ).toEqual(25)
                    expect ( optimizer.state.advice ).toBeLessThan(prev.advice)
                    })
            
                }) 
            })    
        }
        catch (err ) { console.log(err) }
    },
    sanitizeResources: false,
    sanitizeOps: false
})

Deno.test( {
    name: '10.2 - SwarmOptimizer can take rewards give advice based on INTERVAL approach', 
    fn: async () => {
        try {
            let optimizer = await new SwarmOptimizer({
                maximum: 50,
                minimum: 2,
                skipFirst: 0,
                approach: 'interval',
                interval: 10,
                timerMS: 1000
            }, 'interval_optimize_swarm' ).register('interval_optimize_swarm' )
            optimizer.reward(50).then(() => {
                expect ( optimizer.state.reward ).toEqual(50)
                let min = optimizer.conf.minimum
                let max = optimizer.conf.maximum
                expect ( optimizer.state.advice ).toEqual(12)
                optimizer.state.handled = true
                optimizer.publish()

                optimizer.reward(55).then(() => {
                    expect ( optimizer.state.reward ).toEqual(55)
                    expect ( optimizer.state.advice ).toEqual(22)
                    optimizer.state.handled = true
                    optimizer.publish()

                    optimizer.reward(25).then (() => {
                        expect ( optimizer.state.reward ).toEqual(25)
                        expect ( optimizer.state.advice ).toEqual(12)
                    })
                })
            })
           
        }
        catch (err ) { console.log(err) }
    },
sanitizeResources: false,
sanitizeOps: false
})
