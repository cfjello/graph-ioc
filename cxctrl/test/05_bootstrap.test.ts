
import { bootstrap } from "../bootstrap.ts"
import { ctrl, Action, action }  from '../mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'
import { RunIntf, ActionDescriptor } from "../interfaces.ts"
import { promiseChainArgsFac } from "file:///C:/Work/graph-ioc/cxctrl/factories.ts";

//
// Same test as part of the 02_runChain.test.ts, but this with bootstrap'ed classes
//

type P = {name:string, age: number} 
type Q = {name:string, age: number}
type R = {name:string, age: number}
type S = {name:string, age: number}

class ObjP5 extends Action<P> {
    ctrl():boolean { 
        this.state.name = `P5:[]`
        this.publish() 
        return true 
    } 
}

class ObjQ5  extends Action<Q> { 
    ctrl():boolean {
        let stateS: Readonly<S> = ctrl.getState('ObjS5', -1, true) as S
        this.state.name = `Q5:[${stateS.name}]`
        this.publish()
        return true
    }
}

class ObjR5  extends Action<R> { 
    ctrl():boolean {
        // $log.debug(`Into OBJC5 ctrl()`)
        let stateP: Readonly<P> = ctrl.getStateData("ObjP5")
        let stateQ: Readonly<Q> = ctrl.getStateData("ObjQ5")
        this.state.name = `R5:[${stateP.name},${stateQ.name}]`
        this.publish()
        return true
    }
}

class ObjS5  extends Action<S> { 
    ctrl():boolean {
        this.state.name = `S5:[]`
        this.publish()
        return true
        }
}

  // describe('02 - Ctrl can run an Action.ctrl() function as a promise',  () => {
    let instR5 = await bootstrap( ObjR5, { state: {name: 'R', age:38 }, ctrl: 'ctrl', init: true } )
    let instP5 = await bootstrap( ObjP5, { state: {name: 'P', age:38 }, ctrl: 'ctrl', init: true } )
    let instQ5 = await bootstrap( ObjQ5, { state: {name: 'Q', age:38 }, ctrl: 'ctrl', init: true } )
    let instS5 = await bootstrap( ObjS5, { state: {name: 'S', age:38 }, ctrl: 'ctrl', init: true } )
    
    let deps2 = instQ5.setDependencies('ObjS5')
    let deps = instR5.setDependencies('ObjP5','ObjQ5')
    
    Deno.test( {
        name: '05 - Bootstrap: Correct Dependencies before Running execution test', 
        fn: () => {
            expect(deps2).toEqual(['ObjS5']) 
            expect(deps).toEqual(['ObjP5', 'ObjQ5'])
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

    Deno.test({
        name: '05 - Bootstrap: It should RUN the Dependency Promises in order',  
        fn: async () => {       
            let nameR5 = ObjR5.name
            let actionsToRun = ctrl.getActionsToRun(promiseChainArgsFac({ actionName: 'ObjR5'}) )
            expect(actionsToRun.size).toEqual(4)
            let promiseChain: RunIntf = ctrl.getPromiseChain(promiseChainArgsFac({ actionName: 'ObjR5', runAll: true}) )
            expect(ObjR5.name).toEqual(nameR5)
            await promiseChain.run()
            expect(instR5.state.name).toEqual('R5:[P5:[],Q5:[S5:[]]]') 
        },
        sanitizeResources: false,
        sanitizeOps: false
    })


    Deno.test ({
        name: '05 - Bootstrap: It should NOT RUN again with no dirty dependencies',  
        fn: async () => { 
            let nameR5 = ObjR5.name
            // let actionsToRun = ctrl.getActionsToRun('ObjR5')
            let promiseChain: RunIntf = ctrl.getPromiseChain(promiseChainArgsFac({ actionName: 'ObjR5', runAll: false}))
            expect(ObjR5.name).toEqual(nameR5)
            await promiseChain.run()
            
            expect(instR5.state.name).toEqual('R5:[P5:[],Q5:[S5:[]]]') 
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

/* TODO: Fix runTarget */
    Deno.test({
        name: '05 - Bootstrap: runTarget() should only run dirty Dependency targets',  
        fn: async () => { 
            instQ5.state.age = 198
            await instQ5.publish()  // This will now be dirty
            //
            // instQ5 and instP5 should not run
            // but instR5 should run
            //
            let runCount = instR5.meta.callCount
            await ctrl.runTarget('ObjR5')
            let runCount2 = instR5.meta.callCount
            expect(instR5.currActionDesc.ran).toBeTruthy()
            expect( runCount2 ).toEqual(runCount + 1)
        },
        sanitizeResources: false,
        sanitizeOps: false
  })


    Deno.test({
        name: '05 - Bootstrap: It should only run dirty Dependency Promises',  
        fn: async () => { 
            instS5.state.age = 199
            instS5.publish()
            await ctrl.runTarget('ObjQ5') // This will now be dirty
            let runChain: RunIntf = ctrl.getPromiseChain(promiseChainArgsFac({ actionName: 'ObjR5', runAll: false}))
            await runChain.run()
            let tasks: Map<string, ActionDescriptor>   = runChain.getActionsToRun()!

            tasks.forEach((task: ActionDescriptor ,idx) => {
                if (task.actionName == "ObjP5") expect(task.ran).toBeFalsy()
                if (task.actionName == "ObjS5") expect(task.ran).toBeFalsy()
                if (task.actionName == "ObjQ5") expect(task.ran).toBeFalsy()
                if (task.actionName == "ObjR5") expect(task.ran).toBeTruthy()
            })
        },
       sanitizeResources: false,
       sanitizeOps: false
    })


class ObjS4  extends Action<S> { 
        ctrl():boolean {
        this.state.name = `S4:[]`
        this.publish()
        return true
    }
}

    Deno.test({
        name: '05 - Bootstrap: It can remove a registration',  
        fn: async () => { 
            let instS4 = await bootstrap( ObjS4, { state: {name: 'R', age:38 }, ctrl: 'ctrl', init: true } )
            expect( ctrl.actions.has('ObjS4') ).toBeTruthy()
            await ctrl.removeAction("ObjS4")
            expect( ctrl.actions.has('ObjS4') ).toBeFalsy()
            await instS4.register('ObjS4B')
            expect( ctrl.actions.has('ObjS4B') ).toBeTruthy()
        },
        sanitizeResources: false,
        sanitizeOps: false
    })