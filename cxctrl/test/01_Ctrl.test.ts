import {ctrl, Action, action } from '../mod.ts'
import { $log, $plog } from '../../cxutil/mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'
// import {ActionDescriptor, ActionDescriptorIntf} from "./interfaces.ts"
// import { delay } from 'https://deno.land/x/delay/delay.js'

// import * as _ from 'lodash'

type testFuncModel = { arg1:string, arg2:string }
type A = {name:string, age: number} 
type B = {name:string, age: number}
type C = {name:string, age: number}
type D = {name:string, age: number}
type F = {name?:string, age?: number, sex?: string}

/*
function testFunc(): boolean { 
    console.log("testFunc is found"); 
    return true 
}
*/

//
// Ctrl module tests
//
/*
Deno.test('Generator functions should return incremented numbers', () => {
        expect(Ctrl.ctrlId().next().value).toEqual(0)
        expect(Ctrl.ctrlId().next().value).toEqual(1)
        expect(Ctrl.ctrlId().next().value).toEqual(2)
        expect(Ctrl.ctrlId().next().value).toEqual(3)
        expect(Ctrl.ctrlId().next().value).toEqual(4)
        expect(Ctrl.ctrlSeq().next().value).toEqual(0)
        expect(Ctrl.ctrlSeq().next().value).toEqual(1)
        expect(Ctrl.ctrlSeq().next().value).toEqual(2)
        expect(Ctrl.ctrlSeq().next().value).toEqual(3)
        expect(Ctrl.ctrlSeq().next().value).toEqual(4)
    })

*/
    @action<A>({
      state: {name: 'Fidel', age: 85},
      init: true
    })
    class NameAndAge extends Action<A> {
        constructor() {
            super()
        }
        main = ():boolean => { return true }
        nameAndAge = () => { console.log( JSON.stringify(this.state)) }
        getName    = () => { return  this.state.name }
        getAge     = () => { return this.state.age }
    }
   
    let nameAndAge = await new NameAndAge().register()
    // console.log(`NAA constructor name: ${nameAndAge2.constructor.name}`)

    Deno.test({
      name: '01 - Action Object should register under the default name', 
      fn: () => {
        let boolRes = ctrl.store.isRegistered(nameAndAge.meta.name)
        expect(boolRes).toBeTruthy()
      },
      sanitizeResources: false,
      sanitizeOps: false
    })

    Deno.test({
      name: '01 - It should create an Store object entry', 
      fn: () => {
          let state = ctrl.getStateData(nameAndAge.meta.name) as A
          expect(state).toBeDefined()
          expect(state.age).toEqual(85)
      },
      sanitizeResources: false,
      sanitizeOps: false
    });

    Deno.test({
      name: '01 - It should contain a Graph object', 
      fn: () => {
        expect(nameAndAge.meta.name).toEqual('NameAndAge')
        expect(ctrl.graph).toBeDefined()
        expect(ctrl.graph.getNode(nameAndAge.meta.name)).toBeDefined()
      },
      sanitizeResources: false,
      sanitizeOps: false
    });

    Deno.test ({
      name: '01 - Ctrl object should be able to remove Action', 
      fn: async () => {
      await ctrl.removeAction("NameAndAge")
      expect(ctrl.actions.has("NameAndAge")).toBeFalsy()
      expect(ctrl.store.isRegistered("NameAndAge")).toBeFalsy()
      },
      sanitizeResources: false,
      sanitizeOps: false
    }) 

    @action<F>({
        state: { name: 'Fidel', age: 85, sex: 'yoda' },
        init: true
    }) 
    class NameAndAge1 extends Action<F> {
        
        constructor(name: string, age: number ) {
            super()
            this.state.name = name
            this.state.age  = age
        }

        ctrl = ():boolean => { return true }
        nameAndAge = () => { console.log( JSON.stringify(this.state)) }
        getName    = () => { return  this.state.name }
        getAge     = () => { return this.state.age }
    }
    
  
  // console.log(`NAA constructor name: ${nameAndAge2.constructor.name}`)

  Deno.test({
    name: '01 - It can set state parameters', 
    fn: async () => {
        try {
          let nameAndAge = await new NameAndAge1('Fido', 5).register()
        }
        catch(e) {
          expect(e).toEqual('No Problemo')
        } 
    },
    sanitizeResources: false,
    sanitizeOps: false
  })

  Deno.test({
    name: '01 - The action state parameters are not overwritten', 
    fn: async () => {
        let nameAndAge = await new NameAndAge1('Fido', 5).register()
        expect(nameAndAge.state.name).toEqual('Fidel')
        expect(nameAndAge.state.age).toEqual(85)
        expect(nameAndAge.state.sex).toEqual('yoda')
    },
    sanitizeResources: false,
    sanitizeOps: false
  }) 
 
//
// Ctrl dependency graph tests
//
  
    @action<A>({ ctrl: 'main', state:{name: 'A', age:38 }, init: true})
    class ObjA  extends Action<A> {  
      ctrl(): boolean { 
        this.publish();
        return true 
      } 
    }  
    let instA = await new ObjA().register()
    
    @action<B>({ state:{name: 'B', age:38 }, init: true})
    class ObjB  extends ObjA {}  
    let instB = await new ObjB().register()
  
    @action<C>({ state:{name: 'C', age:38 }, init: true})
    class ObjC  extends ObjA {}  
    let instC = await new ObjC().register()
    
    Deno.test({
      name: '01 - Graph dependencies should preserve order', 
      fn: () => {
          let dependencies = instC.setDependencies('ObjA','ObjB')
          expect(dependencies).toEqual(['ObjA', 'ObjB'])
      },
      sanitizeResources: false,
      sanitizeOps: false
    })
  
    Deno.test({
      name: '01 - ctrl.getActionsToRun should return the run list for ObjC', 
      fn: () => {
        let dep = ctrl.getActionsToRun('ObjC')
        expect(dep.size).toEqual(3)
        let storeId = ctrl.store.getStoreId('ObjB')
        let B = dep.get('ObjB')!
        expect(B.storeName).toEqual('ObjB')
        expect(B.ident).toEqual( '01.02')
        expect(B.storeId).toEqual( storeId )
        expect(B.children.length).toEqual(0)
      },
      sanitizeResources: false,
      sanitizeOps: false
    })

    Deno.test({
      name: '01 - ctrl.getActionsToRun should return the same jobId for all objects', 
      fn: () => {
        let actionsToRun = ctrl.getActionsToRun('ObjC')
        let prevJobId = -1
        actionsToRun.forEach( (actionDesc, key) => {
          expect(prevJobId === -1 || ( prevJobId === actionDesc.jobId ) ).toBeTruthy()
          prevJobId = actionDesc.jobId
        })
      },
      sanitizeResources: false,
      sanitizeOps: false
    })
  
    @action<D>({ 
        state:{name: 'D', age:42 },
        init: true
    })
    class ObjD  extends ObjA {}  
    let instD = await new ObjD().register()
  
  
    Deno.test({
      name: '01 - ctrl.getActionsToRun should return a new changed run list', 
      fn: () => {
          instB.setDependencies('ObjD')
          let  dep = ctrl.getActionsToRun('ObjC')
          expect(dep.size).toEqual(4)
          let storeId = ctrl.store.getStoreId('ObjB')
          let B = dep.get('ObjB')!

          expect(B.rootName).toEqual('ObjC')
          expect(B.storeName).toEqual('ObjB')
          expect(B.ident).toEqual( '01.02')
          expect(B.storeId).toEqual( storeId )
          expect(B.children).toEqual(['ObjD'])
    
          let C = dep.get('ObjC')!
          storeId = ctrl.store.getStoreId('ObjC')
          expect(C.rootName).toEqual('ObjC')
          expect(C.storeName).toEqual('ObjC')
          expect(C.storeId).toEqual( storeId )
          expect(C.children).toEqual( [ 'ObjB', 'ObjA' ] )
      },
      sanitizeResources: false,
      sanitizeOps: false
    }) 

    //
    // Promis Chain tests
    //

    
type P = {name:string, age: number} 
type Q = {name:string, age: number}
type R = {name:string, age: number}
type S = {name:string, age: number}

@action( { state: {name: 'P', age:38 } , init: true} ) 
class ObjP  extends Action<P> { ctrl():boolean { this.publish(); return true } }
@action( { state: {name: 'P', age:38 }, init: true } ) 
class ObjP1 extends Action<P> { ctrl():boolean { this.publish(); return true } }
@action( { state: {name: 'P', age:38 }, init: true } ) 
class ObjP2 extends Action<P> {ctrl():boolean { this.publish(); return true } }
@action( { state: {name: 'P', age:38 }, init: true } ) 
class ObjP3 extends Action<P> {
  ctrl():boolean { 
    this.state.name = `P3:[]`
    this.publish() 
    return true 
  } 
}

@action( { state: {name: 'Q', age:38 }, init: true } ) 
class ObjQ  extends Action<Q> {
  ctrl():boolean {
      let stateS: Readonly<S> = ctrl.getStateData('ObjS');
      this.state.name = stateS.name + "," + this.state.name
      this.publish()
      return true
  }
}
@action( { state: {name: 'Q', age:38 }, init: true } ) 
class ObjQ1  extends Action<Q> { 
  ctrl():boolean {
      let stateS: Readonly<S> = ctrl.getStateData('ObjS1');
      this.state.name = stateS.name + "," + this.state.name
      this.publish()
      return true
  }
}

@action( { state: {name: 'Q', age:38 }, init: true } ) 
class ObjQ2  extends Action<Q> { 
  ctrl():boolean {
      let stateS: Readonly<S> = ctrl.getStateData('ObjS2');
      this.state.name = stateS.name + "," + this.state.name
      this.publish()
      return true
  }
}

@action( { state: {name: 'Q', age:38 }, init: true } ) 
class ObjQ3  extends Action<Q> { 
  ctrl():boolean {
      let stateS: Readonly<S> = ctrl.getStateData('ObjS3');
      this.state.name = `Q3:[${stateS.name}]`
      this.publish()
      return true
  }
}

@action( { state: {name: 'R', age:38 }, init: true } ) 
class ObjR  extends Action<R> { 
    ctrl():boolean {
      let stateP: Readonly<P> = ctrl.getStateData("ObjP");
      let stateQ: Readonly<Q> = ctrl.getStateData("ObjQ");
      this.state.name = stateP.name + "," + stateQ.name + "," + this.state.name
      this.publish()
      return true
    }
  }

@action( { state: {name: 'R', age:38 }, init: true } ) 
class ObjR1  extends Action<R> { 
  ctrl():boolean {
    let stateP: Readonly<P> = ctrl.getStateData("ObjP1");
    let stateQ: Readonly<Q> = ctrl.getStateData("ObjQ1");
    this.state.name = stateP.name + "," + stateQ.name + "," + this.state.name
    this.publish()
    return true
  }
}

@action( { state: {name: 'R', age:38 }, init: true } ) 
class ObjR2  extends Action<R> { 
  ctrl():boolean {
    let stateP: Readonly<P> = ctrl.getStateData("ObjP2");
    let stateQ: Readonly<Q> = ctrl.getStateData("ObjQ2");
    this.state.name = stateP.name + "," + stateQ.name + "," + this.state.name
    this.publish()
    return true
  }
}

@action( { state: {name: 'R', age:38 }, init: true } ) 
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

@action( { state: {name: 'S', age:38 }, init: true } ) 
  class ObjS  extends Action<S> { 
    ctrl():boolean {
      this.publish()
      return true
    }
  }

  @action( { state: {name: 'S', age:38 }, init: true } ) 
  class ObjS1  extends Action<S> { 
    ctrl():boolean {
      this.publish()
      return true
    }
  }

  @action( { state: {name: 'S', age:38 }, init: true } ) 
  class ObjS2  extends Action<S> { 
    ctrl():boolean {
      this.publish()
      return true
      }
  }

  @action( { state: {name: 'S', age:38 }, init: true } ) 
  class ObjS3  extends Action<S> { 
    ctrl():boolean {
      this.state.name = `S3:[]`
      this.publish()
      return true
      }
  }

  // describe('Ctrl can run an Action.ctrl() function as a promise',  () => {
    let instR3 = await new ObjR3().register()
    let instP3 = await new ObjP3().register()
    let instQ3 = await new ObjQ3().register()
    let instS3 = await new ObjS3().register()

    // await delay(2000)

    let deps2 = instQ3.setDependencies('ObjS3')
    let deps = instR3.setDependencies('ObjP3','ObjQ3')
    
    Deno.test( '01 - Correct Dependencies before Running execution test', () => {
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
/**
 * 
    Deno.test('It should RUN the Dependency Promises in order',  async () => {       
        let nameR3 = ObjR3.name
        let actionsToRun = ctrl.getActionsToRun('ObjR3')
        expect(actionsToRun.size).toEqual(4)
        let promiseChain: ActionDescriptorIntf = ctrl.getPromiseChain('ObjR3', true)
        expect(ObjR3.name).toEqual(nameR3)
        promiseChain.run()
        await delay (3000)
        expect(instR3.state.name).toEqual('R3:[P3:[],Q3:[S3:[]]]') 
        // expect(false).toBeTruthy()
    })

    Deno.test ('It should NOT RUN again with no dirty dependencies',  async () => { 
        let nameR3 = ObjR3.name
        let actionsToRun = ctrl.getActionsToRun('ObjR3')
        let promiseChain: ActionDescriptorIntf = ctrl.getPromiseChain('ObjR3', false)
        expect(ObjR3.name).toEqual(nameR3)
        promiseChain.run()
        await delay(3000)
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