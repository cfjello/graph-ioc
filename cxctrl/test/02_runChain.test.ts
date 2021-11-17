
import { ctrl, Action, action }  from '../mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'
import { RunIntf, ActionDescriptor } from "../interfaces.ts"
import { promiseChainArgsFac } from "file:///C:/Work/graph-ioc/cxctrl/factories.ts";

type P = {name:string, age: number} 
type Q = {name:string, age: number}
type R = {name:string, age: number}
type S = {name:string, age: number}

@action( { state: {name: 'P', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjP  extends Action<P> { ctrl():boolean { this.publish(); return true } }
@action( { state: {name: 'P', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjP1 extends Action<P> { ctrl():boolean { this.publish(); return true } }
@action( { state: {name: 'P', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjP2 extends Action<P> {ctrl():boolean { this.publish(); return true } }
@action( { state: {name: 'P', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjP3 extends Action<P> {
  ctrl():boolean { 
    this.state.name = `P3:[]`
    this.publish() 
    return true 
  } 
}

@action( { state: {name: 'Q', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjQ  extends Action<Q> {
  ctrl():boolean {
      let stateS: Readonly<S> = ctrl.getStateData('ObjS');
      this.state.name = stateS.name + "," + this.state.name
      this.publish()
      return true
  }
}
@action( { state: {name: 'Q', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjQ1  extends Action<Q> { 
  ctrl():boolean {
      let stateS: Readonly<S> = ctrl.getStateData('ObjS1');
      this.state.name = stateS.name + "," + this.state.name
      this.publish()
      return true
  }
}

@action( { state: {name: 'Q', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjQ2  extends Action<Q> { 
  ctrl():boolean {
      let stateS: Readonly<S> = ctrl.getStateData('ObjS2');
      this.state.name = stateS.name + "," + this.state.name
      this.publish()
      return true
  }
}

@action( { state: {name: 'Q', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjQ3  extends Action<Q> { 
  ctrl():boolean {
      let stateS: Readonly<S> = ctrl.getStateData('ObjS3');
      this.state.name = `Q3:[${stateS.name}]`
      this.publish()
      return true
  }
}

@action( { state: {name: 'R', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjR  extends Action<R> { 
    ctrl():boolean {
      let stateP: Readonly<P> = ctrl.getStateData("ObjP");
      let stateQ: Readonly<Q> = ctrl.getStateData("ObjQ");
      this.state.name = stateP.name + "," + stateQ.name + "," + this.state.name
      this.publish()
      return true
    }
  }

@action( { state: {name: 'R', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjR1  extends Action<R> { 
  ctrl():boolean {
    let stateP: Readonly<P> = ctrl.getStateData("ObjP1");
    let stateQ: Readonly<Q> = ctrl.getStateData("ObjQ1");
    this.state.name = stateP.name + "," + stateQ.name + "," + this.state.name
    this.publish()
    return true
  }
}

@action( { state: {name: 'R', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjR2  extends Action<R> { 
  ctrl():boolean {
    let stateP: Readonly<P> = ctrl.getStateData("ObjP2");
    let stateQ: Readonly<Q> = ctrl.getStateData("ObjQ2");
    this.state.name = stateP.name + "," + stateQ.name + "," + this.state.name
    this.publish()
    return true
  }
}

@action( { state: {name: 'R', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjR3  extends Action<R> { 
  ctrl():boolean {
    // $log.debug(`Into OBJC3 ctrl()`)
    let stateP: Readonly<P> = ctrl.getStateData("ObjP3");
    let stateQ: Readonly<Q> = ctrl.getStateData("ObjQ3");
    this.state.name = `R3:[${stateP.name},${stateQ.name}]`
    this.publish()
    return true
  }
}

@action( { state: {name: 'S', age:38 }, ctrl: 'ctrl', init: true } ) 
  class ObjS  extends Action<S> { 
    ctrl():boolean {
      this.publish()
      return true
    }
  }

  @action( { state: {name: 'S', age:38 }, ctrl: 'ctrl', init: true } ) 
  class ObjS1  extends Action<S> { 
    ctrl():boolean {
      this.publish()
      return true
    }
  }

  @action( { state: {name: 'S', age:38 }, ctrl: 'ctrl', init: true } ) 
  class ObjS2  extends Action<S> { 
  ctrl():boolean {
    this.publish()
    return true
    }
  }

  @action( { state: {name: 'S', age:38 }, ctrl: 'ctrl', init: true } ) 
  class ObjS3  extends Action<S> { 
    ctrl():boolean {
      this.state.name = `S3:[]`
      this.publish()
      return true
      }
  }

  // describe('02 - Ctrl can run an Action.ctrl() function as a promise',  () => {
    let instR3 = await new ObjR3().register()
    let instP3 = await new ObjP3().register()
    let instQ3 = await new ObjQ3().register()
    let instS3 = await new ObjS3().register()
    
    let deps2 = instQ3.setDependencies('ObjS3')
    let deps = instR3.setDependencies('ObjP3','ObjQ3')
    
    Deno.test( {
      name: '02 - Correct Dependencies before Running execution test', 
      fn: () => {
          expect(deps2).toEqual(['ObjS3']) 
          expect(deps).toEqual(['ObjP3', 'ObjQ3'])
      },
      sanitizeResources: false,
      sanitizeOps: false
    })

    Deno.test({
      name: '02 - It should RUN the Dependency Promises in order',  
      fn : async () => {       
          let nameR3 = ObjR3.name
          let actionsToRun = ctrl.getActionsToRun( promiseChainArgsFac({ actionName: 'ObjR3'}) )
          expect(actionsToRun.size).toEqual(4)
          let promiseChain: RunIntf = ctrl.getPromiseChain( promiseChainArgsFac({ actionName: 'ObjR3', runAll: true}) )
          expect(ObjR3.name).toEqual(nameR3)
          await promiseChain.run()
          expect(instR3.state.name).toEqual('R3:[P3:[],Q3:[S3:[]]]') 
      },
      sanitizeResources: false,
      sanitizeOps: false
    })


    Deno.test ( {
      name: '02 - It should NOT RUN again with no dirty dependencies', 
      fn:  async () => { 
          let nameR3 = ObjR3.name
          // let actionsToRun = ctrl.getActionsToRun('ObjR3')
          let promiseChain: RunIntf = ctrl.getPromiseChain( promiseChainArgsFac({ actionName: 'ObjR3', runAll: false}) )
          expect(ObjR3.name).toEqual(nameR3)
          await promiseChain.run()
          
          expect(instR3.state.name).toEqual('R3:[P3:[],Q3:[S3:[]]]') 
      },
      sanitizeResources: false,
      sanitizeOps: false
    })

    Deno.test({
      name: '02 - runTarget() should only run dirty Dependency targets',  
      fn: async () => { 
          instQ3.state.age = 198
          await instQ3.publish()  // This will now be dirty
          //
          // instQ3 and instP3 should not run
          // but instR3 should run
          //
          let runCount = instR3.meta.callCount
          await ctrl.runTarget('ObjR3')
          let runCount2 = instR3.meta.callCount
          expect(instR3.currActionDesc.ran).toBeTruthy()
          expect( runCount2 ).toEqual(runCount + 1)
      },
      sanitizeResources: false,
      sanitizeOps: false
  })

/* Dependencies are:
*     let deps2 = instQ3.setDependencies('ObjS3')
*     let deps = instR3.setDependencies('ObjP3','ObjQ3')
*/
    Deno.test('02 - It should only run dirty Dependency Promises',  async () => { 
        instS3.state.age = 199
        instS3.publish()
        await ctrl.runTarget('ObjQ3') // This will now be dirty
        let runChain: RunIntf = ctrl.getPromiseChain( promiseChainArgsFac({ actionName: 'ObjR3', runAll: false}) )
        await runChain.run()
        let tasks: Map<string, ActionDescriptor>   = runChain.getActionsToRun()!

       tasks.forEach((task: ActionDescriptor ,idx) => {
         if (task.actionName == "ObjP3") expect(task.ran).toBeFalsy()
         if (task.actionName == "ObjS3") expect(task.ran).toBeFalsy()
         if (task.actionName == "ObjQ3") expect(task.ran).toBeFalsy()
         if (task.actionName == "ObjR3") expect(task.ran).toBeTruthy()
      })
    })


    @action( { state: {name: 'S', age:38 }, ctrl: 'ctrl', init: true } ) 
    class ObjS4  extends Action<S> { 
      ctrl():boolean {
        this.state.name = `S4:[]`
        this.publish()
        return true
        }
    }

    Deno.test({
      name: '02 - It can remove a registration',  
      fn: async () => { 
          let instR4 = await new ObjS4().register()
          expect( ctrl.actions.has('ObjS4') ).toBeTruthy()
          await ctrl.removeAction("ObjS4")
          expect( ctrl.actions.has('ObjS4') ).toBeFalsy()
          await instR4.register()
          expect( ctrl.actions.has('ObjS4') ).toBeTruthy()
      },
      sanitizeResources: false,
      sanitizeOps: false
    })
  