
import { ctrl, Action, action }  from '../mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'
import { RunIntf } from "../interfaces.ts"
import { ActionDescriptor } from '../ActionDescriptor.ts'

/*
import * as  Ctrl from '../src/Ctrl'
import { Action } from '../src/Action'

*/ 
// import * as _ from 'lodash'
// import { action } from '../src/decorators'
// import { collapseTextChangeRangesAcrossMultipleVersions } from "typescript"


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
      let stateS: Readonly<S> = ctrl.getState('ObjS');
      this.state.name = stateS.name + "," + this.state.name
      this.publish()
      return true
  }
}
@action( { state: {name: 'Q', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjQ1  extends Action<Q> { 
  ctrl():boolean {
      let stateS: Readonly<S> = ctrl.getState('ObjS1');
      this.state.name = stateS.name + "," + this.state.name
      this.publish()
      return true
  }
}

@action( { state: {name: 'Q', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjQ2  extends Action<Q> { 
  ctrl():boolean {
      let stateS: Readonly<S> = ctrl.getState('ObjS2');
      this.state.name = stateS.name + "," + this.state.name
      this.publish()
      return true
  }
}

@action( { state: {name: 'Q', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjQ3  extends Action<Q> { 
  ctrl():boolean {
      let stateS: Readonly<S> = ctrl.getState('ObjS3');
      this.state.name = `Q3:[${stateS.name}]`
      this.publish()
      return true
  }
}

@action( { state: {name: 'R', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjR  extends Action<R> { 
    ctrl():boolean {
      let stateP: Readonly<P> = ctrl.getState("ObjP");
      let stateQ: Readonly<Q> = ctrl.getState("ObjQ");
      this.state.name = stateP.name + "," + stateQ.name + "," + this.state.name
      this.publish()
      return true
    }
  }

  @action( { state: {name: 'R', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjR1  extends Action<R> { 
  ctrl():boolean {
    let stateP: Readonly<P> = ctrl.getState("ObjP1");
    let stateQ: Readonly<Q> = ctrl.getState("ObjQ1");
    this.state.name = stateP.name + "," + stateQ.name + "," + this.state.name
    this.publish()
    return true
  }
}

@action( { state: {name: 'R', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjR2  extends Action<R> { 
  ctrl():boolean {
    let stateP: Readonly<P> = ctrl.getState("ObjP2");
    let stateQ: Readonly<Q> = ctrl.getState("ObjQ2");
    this.state.name = stateP.name + "," + stateQ.name + "," + this.state.name
    this.publish()
    return true
  }
}

@action( { state: {name: 'R', age:38 }, ctrl: 'ctrl', init: true } ) 
class ObjR3  extends Action<R> { 
  ctrl():boolean {
    // $log.debug(`Into OBJC3 ctrl()`)
    let stateP: Readonly<P> = ctrl.getState("ObjP3");
    let stateQ: Readonly<Q> = ctrl.getState("ObjQ3");
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


  // ctrl.removeAction("ObjR3")
  // ctrl.removeAction("ObjP3")
  // ctrl.removeAction("ObjQ3")
  // ctrl.removeAction("ObjS3")

  // describe('03 - Ctrl can run an Action.ctrl() function as a promise',  () => {
    let instR3 = await new ObjR3().register()
    let instP3 = await new ObjP3().register()
    let instQ3 = await new ObjQ3().register()
    let instS3 = await new ObjS3().register()
    
    let deps2 = instQ3.setDependencies('ObjS3')
    let deps = instR3.setDependencies('ObjP3','ObjQ3')
    
    Deno.test( '03 - Correct Dependencies before Running execution test', () => {
      expect(deps2).toEqual(['ObjS3']) 
      expect(deps).toEqual(['ObjP3', 'ObjQ3'])
    })
    
    /*
    test('It should RUN a ctrl()', () => {
      expect(Ctrl.runTarget('ObjD3')).toBeTruthy()
      expect(instD3.state.name).toEqual('D3:[]')
      expect(Ctrl.runTarget('ObjA3')).toBeTruthy()
      expect(instA3.state.name).toEqual('A3:[]')
    })
 
  
    test('It should RUN Dependencies', () => {
      expect(Ctrl.runTarget('ObjB3')).toBeTruthy()
      expect(instQ3.state.name).toEqual('Q3:[S3:[]]')
    })
  */ 
 

    Deno.test('03 - It should RUN the Dependency Promises in order',  async () => {       
        let nameR3 = ObjR3.name
        let actionsToRun = ctrl.getActionsToRun('ObjR3')
        expect(actionsToRun.size).toEqual(4)
        let promiseChain: RunIntf = ctrl.getPromiseChain('ObjR3', true)
        expect(ObjR3.name).toEqual(nameR3)
        await promiseChain.run()
        expect(instR3.state.name).toEqual('R3:[P3:[],Q3:[S3:[]]]') 
    })

    Deno.test ('03 - It should NOT RUN again with no dirty dependencies',  async () => { 
        let nameR3 = ObjR3.name
        let actionsToRun = ctrl.getActionsToRun('ObjR3')
        let promiseChain: RunIntf = ctrl.getPromiseChain('ObjR3', false)
        expect(ObjR3.name).toEqual(nameR3)
        await promiseChain.run()
        
        expect(instR3.state.name).toEqual('R3:[P3:[],Q3:[S3:[]]]') 
    })

    /*
    Deno.test('It should only run dirty Dependency targets',  async () => { 
      instS3.state.age = 198
      instS3.publish()
      await ctrl.runTarget('ObjQ3') // This will now be dirty
      let nameR3 = ObjR3.name
      await ctrl.runTarget('ObjP3')

       // expect(ObjP3.currActionDesc.ran).toBeFalsy()
       // if (task.name == "ObjS3") expect(task.ran).toBeFalsy()
       // if (task.name == "ObjQ3") expect(task.ran).toBeTruthy()
       // if (task.name == "ObjR3") expect(task.ran).toBeTruthy()
  })
  */


    Deno.test('03 - It should only run dirty Dependency Promises',  async () => { 
        instS3.state.age = 199
        instS3.publish()
        await ctrl.runTarget('ObjQ3') // This will now be dirty
        let nameR3 = ObjR3.name
        let actionsToRun = ctrl.getActionsToRun('ObjP3')
        let runChain: RunIntf = ctrl.getPromiseChain('ObjR3', false)
        await runChain.run()
        let jobName = runChain.getEventName()
        let tasks: Map<string, ActionDescriptor>   = runChain.getActionsToRun()!

        /*
        tasks.forEach((val: ActionDescriptor ,idx) => {
          console.log(val.taskId,val.name, val.ran)
        })
        */ 
       tasks.forEach((task: ActionDescriptor ,idx) => {
         if (task.name == "ObjP3") expect(task.ran).toBeFalsy()
         if (task.name == "ObjS3") expect(task.ran).toBeFalsy()
         if (task.name == "ObjQ3") expect(task.ran).toBeTruthy()
         if (task.name == "ObjR3") expect(task.ran).toBeTruthy()
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

    Deno.test('03 - It can remove a registration',  async () => { 
      let instR4 = await new ObjS4().register()
      expect( ctrl.actions.has('ObjS4') ).toBeTruthy()
      await ctrl.removeAction("ObjS4")
      expect( ctrl.actions.has('ObjS4') ).toBeFalsy()
      await instR4.register()
      expect( ctrl.actions.has('ObjS4') ).toBeTruthy()
    })
  