import { ctrl, Action, action }  from '../mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'
import { RunIntf, ActionDescriptor } from "../interfaces.ts"

type P = {name:string, age: number} 
type Q = {name:string, age: number}
type R = {name:string, age: number}
type S = {name:string, age: number}

@action( { state: {name: 'P', age:18 }, init: true } ) 
class ObjP extends Action<P> {
    idx: number = 1

    main():boolean { 
        // let stateQ: Q = ctrl.getState("ObjQ")
        this.state.name = `P_${this.idx++}`
        this.state.age++
        this.publish() 
        return true 
    } 
}

@action( { state: {name: 'Q', age:28 }, init: true } ) 
class ObjQ  extends Action<Q> {
    idx: number = 1
    main():boolean {
        // let stateR: R = ctrl.getState("ObjR");  
        // let stateS: S = ctrl.getState("ObjS");  
        this.state.name = `Q_${this.idx++}`
        this.state.age++
        this.publish()
        return true
    }
}

@action( { state: {name: 'R', age:38 }, init: true } ) 
class ObjR  extends Action<R> { 
    idx: number = 1
    main():boolean {        
        this.state.name = `R_${this.idx++}`
        this.state.age++
        this.publish()
        return true
    }
  }

  @action( { state: {name: 'S', age:48 }, init: true } ) 
  class ObjS  extends Action<S> { 
    idx: number = 1
    main():boolean {
        this.state.name = `R_${this.idx++}`
        this.state.age++
        this.publish()
        return true
    }
  }
  
  let instP = await new ObjP().register()
  let instQ = await new ObjQ().register()
  let instR = await new ObjR().register()
  let instS = await new ObjS().register()
  
  instP.setDependencies('ObjQ')
  instQ.setDependencies('ObjR', 'ObjS')
  
  instS.main() // This is now dirty
  // console.log('-----------------------')
  // await ctrl.runTarget('ObjP')
  await instP.run()
  let collection = ctrl.store.getCollection( instP.currActionDesc.jobId, undefined, false )

  Deno.test( {
    name: '04 - After runTarget() the collection should be populated', 
    fn: async () => {
        expect( collection.size).toEqual(4)
        collection.forEach( (obj, key) => {
            expect(obj).toBeDefined()
            expect( instP.currActionDesc.jobId >= obj.meta.jobId ).toBeTruthy()
        })
    },
    sanitizeResources: false,
    sanitizeOps: false
  })

  @action( { state: {name: 'P', age:18 }, init: true } ) 
class ObjP1 extends Action<P> {
    idx: number = 1

    main():boolean { 
        let stateQ: Readonly<Q> = ctrl.getStateData("ObjQ")
        this.state.name = `P_${this.idx++}`
        this.state.age++
        this.publish() 
        return true 
    } 
}

@action( { state: {name: 'Q', age:28 }, init: true } ) 
class ObjQ1  extends Action<Q> {
    idx: number = 1
    main():boolean {
        let stateR: Readonly<P> = ctrl.getStateData("ObjR");  
        let stateS: Readonly<P> = ctrl.getStateData("ObjS");  
        this.state.name = `Q_${this.idx++}`
        this.state.age++
        this.publish()
        return true
    }
}

@action( { state: {name: 'R', age:38 }, init: true } ) 
class ObjR1  extends Action<R> { 
    idx: number = 1
    main():boolean {        
        this.state.name = `R_${this.idx++}`
        this.state.age++
        this.publish()
        return true
    }
  }

  @action( { state: {name: 'S', age:48 }, init: true } ) 
  class ObjS1  extends Action<S> { 
    idx: number = 1
    main():boolean {
        this.state.name = `R_${this.idx++}`
        this.state.age++
        this.publish()
        return true
    }
  }
  
  let instP1 = await new ObjP1().register()
  let instQ1 = await new ObjQ1().register()
  let instR1 = await new ObjR1().register()
  let instS1 = await new ObjS1().register()
  
  instP.setDependencies('ObjQ1')
  instQ.setDependencies('ObjR1', 'ObjS1')
  
  instS1.main() // This is now dirty
 
  await ctrl.getPromiseChain('ObjP1').run()
  let collection1 = ctrl.store.getCollection( instP1.currActionDesc.jobId, undefined, false )

  Deno.test( {
    name: '04 - After run PromiseChain the collection should be populated', 
    fn: async () => {
        expect( collection.size).toEqual(4)
        collection.forEach( (obj, key) => {
            expect(obj).toBeDefined()
            expect( instP1.currActionDesc.jobId >= obj.meta.jobId ).toBeTruthy()
        })
    },
    sanitizeResources: false,
    sanitizeOps: false
  })

/* TODO: test when/if  functions are added
  Deno.test( {
    name: '04 - getIndexStoreId can find a storeId and getIndexState can find the object', 
    fn: async () => {
        expect( collection.size).toEqual(4)
        collection.forEach( (obj: Action<any>, key) => {
            let storeId = ctrl.store.getIndexStoreId(key, obj.currActionDesc.jobId, 'J')
            expect( storeId).toEqual(obj.currActionDesc.storeId)
            let obj_1 = ctrl.store.getIndexState(key, obj.currActionDesc.jobId, 'J')
            expect( obj_1).toEqual(obj)
        })
    },
    sanitizeResources: false,
    sanitizeOps: false
  })
*/
  
  