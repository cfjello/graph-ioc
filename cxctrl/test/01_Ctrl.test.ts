import {ctrl, Action, action } from '../mod.ts'
import { $log, $plog } from '../../cxutil/mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'
import { promiseChainArgsFac } from "file:///C:/Work/graph-ioc/cxctrl/factories.ts";
import { delay } from "https://deno.land/x/delay@v0.2.0/mod.ts";
// import {ActionDescriptor, ActionDescriptorIntf} from "./interfaces.ts"
// import { delay } from 'https://deno.land/x/mod.js'

// import * as _ from 'lodash'

type testFuncModel = { arg1:string, arg2:string }
type A = {name:string, age: number} 
type B = {name:string, age: number}
type C = {name:string, age: number}
type D = {name:string, age: number}
type F = {name?:string, age?: number, sex?: string}

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
        getstateName    = () => { return  this.state.name }
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
  
  
    
    Deno.test({
      name: '01 - Graph dependencies should preserve order', 
      fn: async () => {
        @action<C>({ state:{name: 'C', age:38 }, init: true})
        class ObjC  extends ObjA {}  
        let instC = await new ObjC().register()
        let dependencies = instC.setDependencies('ObjA','ObjB')
        expect(dependencies).toEqual(['ObjA', 'ObjB'])
      },
      sanitizeResources: false,
      sanitizeOps: false
    })
  
    Deno.test({
      name: '01 - ctrl.getActionsToRun should return the run list for ObjC', 
      fn: async () => {
        @action<C>({ state:{name: 'D', age:38 }, init: true})
        class ObjE  extends ObjA {}  
        let instE = await new ObjE().register()
        let dependencies = instE.setDependencies('ObjA','ObjB')
        let dep = ctrl.getActionsToRun( promiseChainArgsFac({ actionName: 'ObjE'}) )
        expect(dep.size).toEqual(3)
        let storeId = ctrl.store.getStoreId('ObjB', -1)
        let B = dep.get('ObjB')!
        expect(B.storeName).toEqual('ObjB')
        expect(B.ident == '01.02' || B.ident == '1.2'  ).toBeTruthy()
        // console.log(`ObjB: ${JSON.stringify( ctrl.getState('ObjB', -1, false) )}`)
        // console.log(`B.storeId: ${JSON.stringify(B)}`)
        expect(B.storeId).toEqual( storeId )
        expect(B.children.length).toEqual(0)
      },
      sanitizeResources: false,
      sanitizeOps: false
    })

    Deno.test({
      name: '01 - ctrl.getActionsToRun should return the same jobId for all objects', 
      fn: () => {
        let actionsToRun = ctrl.getActionsToRun( promiseChainArgsFac({ actionName: 'ObjC'}) )
        let prevJobId = -1
        actionsToRun.forEach( (actionDesc, key) => {
          expect(prevJobId === -1 || ( prevJobId === actionDesc.jobId ) ).toBeTruthy()
          prevJobId = actionDesc.jobId
        })
      },
      sanitizeResources: false,
      sanitizeOps: false
    })
 
 
    Deno.test({
      name: '01 - ctrl.getActionsToRun should return a new changed run list', 
      fn: async () => {      
          @action<D>({ 
              state:{name: 'D', age:42 },
              init: true
          })
          class ObjD  extends ObjA {}  
          let instD = await new ObjD().register()

          instB.setDependencies('ObjD')

          let  dep = ctrl.getActionsToRun( promiseChainArgsFac({ actionName: 'ObjC'}) )
          expect(dep.size).toEqual(4)
          let storeId = ctrl.store.getStoreId('ObjB')
          let B = dep.get('ObjB')!

          expect(B.rootName).toEqual('ObjC')
          expect(B.storeName).toEqual('ObjB')
          expect(B.ident == '01.02' || B.ident == '1.2'  ).toBeTruthy()
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
