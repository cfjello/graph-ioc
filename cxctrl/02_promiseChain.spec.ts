/// <reference types= "@types/jest"  />
import {Ctrl, Action, action } from '../lib/cxctrl'
import {ActionDescriptor, ActionDescriptorIntf} from "../src/interfaces"
/*
import * as  Ctrl from '../src/Ctrl'
import { Action } from '../src/Action'

*/ 
import * as _ from 'lodash'
// import { action } from '../src/decorators'
import { collapseTextChangeRangesAcrossMultipleVersions } from "typescript"


type P = {name:string, age: number} 
type Q = {name:string, age: number}
type R = {name:string, age: number}
type S = {name:string, age: number}

@action( { state: {name: 'P', age:38 } } ) 
class ObjP  extends Action<P> { ctrl():boolean { this.publish(); return true } }
@action( { state: {name: 'P', age:38 } } ) 
class ObjP1 extends Action<P> { ctrl():boolean { this.publish(); return true } }
@action( { state: {name: 'P', age:38 } } ) 
class ObjP2 extends Action<P> {ctrl():boolean { this.publish(); return true } }
@action( { state: {name: 'P', age:38 } } ) 
class ObjP3 extends Action<P> {
  ctrl():boolean { 
    this.state.name = `P3:[]`
    this.publish() 
    return true 
  } 
}

@action( { state: {name: 'Q', age:38 } } ) 
class ObjQ  extends Action<Q> {
  ctrl():boolean {
      let stateS: Readonly<S> = Ctrl.getState('ObjS');
      this.state.name = stateS.name + "," + this.state.name
      this.publish()
      return true
  }
}
@action( { state: {name: 'Q', age:38 } } ) 
class ObjQ1  extends Action<Q> { 
  ctrl():boolean {
      let stateS: Readonly<S> = Ctrl.getState('ObjS1');
      this.state.name = stateS.name + "," + this.state.name
      this.publish()
      return true
  }
}

@action( { state: {name: 'Q', age:38 } } ) 
class ObjQ2  extends Action<Q> { 
  ctrl():boolean {
      let stateS: Readonly<S> = Ctrl.getState('ObjS2');
      this.state.name = stateS.name + "," + this.state.name
      this.publish()
      return true
  }
}

@action( { state: {name: 'Q', age:38 } } ) 
class ObjQ3  extends Action<Q> { 
  ctrl():boolean {
      let stateS: Readonly<S> = Ctrl.getState('ObjS3');
      this.state.name = `Q3:[${stateS.name}]`
      this.publish()
      return true
  }
}

@action( { state: {name: 'R', age:38 } } ) 
class ObjR  extends Action<R> { 
    ctrl():boolean {
      let stateP: Readonly<P> = Ctrl.getState("ObjP");
      let stateQ: Readonly<Q> = Ctrl.getState("ObjQ");
      this.state.name = stateP.name + "," + stateQ.name + "," + this.state.name
      this.publish()
      return true
    }
  }

  @action( { state: {name: 'R', age:38 } } ) 
class ObjR1  extends Action<R> { 
  ctrl():boolean {
    let stateP: Readonly<P> = Ctrl.getState("ObjP1");
    let stateQ: Readonly<Q> = Ctrl.getState("ObjQ1");
    this.state.name = stateP.name + "," + stateQ.name + "," + this.state.name
    this.publish()
    return true
  }
}

@action( { state: {name: 'R', age:38 } } ) 
class ObjR2  extends Action<R> { 
  ctrl():boolean {
    let stateP: Readonly<P> = Ctrl.getState("ObjP2");
    let stateQ: Readonly<Q> = Ctrl.getState("ObjQ2");
    this.state.name = stateP.name + "," + stateQ.name + "," + this.state.name
    this.publish()
    return true
  }
}

@action( { state: {name: 'R', age:38 } } ) 
class ObjR3  extends Action<R> { 
  ctrl():boolean {
    // $log.debug(`Into OBJC3 ctrl()`)
    let stateP: Readonly<P> = Ctrl.getState("ObjP3");
    let stateQ: Readonly<Q> = Ctrl.getState("ObjQ3");
    this.state.name = `R3:[${stateP.name},${stateQ.name}]`
    this.publish()
    return true
  }
}

@action( { state: {name: 'S', age:38 } } ) 
  class ObjS  extends Action<S> { 
    ctrl():boolean {
      this.publish()
      return true
    }
  }

  @action( { state: {name: 'S', age:38 } } ) 
  class ObjS1  extends Action<S> { 
    ctrl():boolean {
      this.publish()
      return true
    }
  }

  @action( { state: {name: 'S', age:38 } } ) 
  class ObjS2  extends Action<S> { 
  ctrl():boolean {
    this.publish()
    return true
    }
  }

  @action( { state: {name: 'S', age:38 } } ) 
  class ObjS3  extends Action<S> { 
    ctrl():boolean {
      this.state.name = `S3:[]`
      this.publish()
      return true
      }
  }

  describe('Ctrl can run an Action.ctrl() function as a promise',  () => {
    let instR3 = new ObjR3()
    let instP3 = new ObjP3()
    let instQ3 = new ObjQ3()
    let instS3 = new ObjS3()
    
    let deps2 = instQ3.setDependencies('ObjS3')
    let deps = instR3.setDependencies('ObjP3','ObjQ3')
    
    test( 'Correct Dependencies before Running execution test', () => {
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
  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

    test('It should RUN the Dependency Promises in order',  async () => {       
        let nameR3 = ObjR3.name
        let actionsToRun = Ctrl.getActionsToRun('ObjR3')
        expect(actionsToRun.size).toEqual(4)
        let promiseChain: ActionDescriptorIntf = Ctrl.getPromiseChain('ObjR3', true)
        expect(ObjR3.name).toEqual(nameR3)
        promiseChain.run()
        await sleep(3000)
        expect(instR3.state.name).toEqual('R3:[P3:[],Q3:[S3:[]]]') 
        // expect(false).toBeTruthy()
    })

    test ('It should NOT RUN again with no dirty dependencies',  async () => { 
        let nameR3 = ObjR3.name
        let actionsToRun = Ctrl.getActionsToRun('ObjR3')
        let promiseChain: ActionDescriptorIntf = Ctrl.getPromiseChain('ObjR3', false)
        expect(ObjR3.name).toEqual(nameR3)
        promiseChain.run()
        await sleep(3000)
        expect(instR3.state.name).toEqual('R3:[P3:[],Q3:[S3:[]]]') 
    })

    /*
    test('It should only run dirty Dependency Promises',  async () => { 
        Ctrl.runTarget('ObjQ3') // This will now be dirty
        let nameR3 = ObjR3.name
        let actionsToRun = Ctrl.getActionsToRun('ObjP3')
        let promiseChain: ActionDescriptorIntf = Ctrl.getPromiseChain('ObjR3', false)
        expect(ObjR3.name).toEqual(nameR3)
        promiseChain.run()
        await sleep(3000)
        expect(instR3.state.name).toEqual('R3:[P3:[],Q3:[]]') 
    })
    */ 
  })