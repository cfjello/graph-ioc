import * as  Ctrl from './Ctrl.ts'
import { Action } from './Action.ts'
import { action } from './decorators/mod.ts'
import { $log, $plog } from '../cxutil/mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'


// import * as _ from 'lodash'

type testFuncModel = { arg1:string, arg2:string }

function testFunc(): boolean { 
    console.log("testFunc is found"); 
    return true 
}

/*
describe('Logger should read the .env file',  () => {

    test('It should read the correct LOG_LEVEL', () => {
      expect(process.env.LOG_LEVEL).toBeDefined()
      // Change this next one to reflect your debug level
      expect(process.env.LOG_LEVEL).toEqual('debug')
    })
})
*/ 


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

type A = {name:string, age: number} 
type B = {name:string, age: number}
type C = {name:string, age: number}
type D = {name:string, age: number}
type F = {name?:string, age?: number, sex?: string}


    @action<A>({
      state: {name: 'Fidel', age: 85}
    })
    class NameAndAge extends Action<A> {
        constructor() {
            super()
        }
        ctrl = ():boolean => { return true }
        nameAndAge = () => { console.log( JSON.stringify(this.state)) }
        getName    = () => { return  this.state.name }
        getAge     = () => { return this.state.age }
    }
   
    let nameAndAge = new NameAndAge()
    // console.log(`NAA constructor name: ${nameAndAge2.constructor.name}`)

    Deno.test('Action Object should register under the default name', () => {
        expect(Ctrl.store.isRegistered(nameAndAge.name)).toBeTruthy()
    })

    Deno.test('It should create an Store object entry', () => {
        let state = Ctrl.getState(nameAndAge.name);
        expect(state).toBeDefined()
        // console.log(inspect(state))
        expect(state.age).toEqual(85)
    });

    Deno.test('It should contain a Graph object', () => {
        expect(nameAndAge.name).toEqual('NameAndAge')
        expect(Ctrl.graph).toBeDefined()
        expect(Ctrl.graph.getNode(nameAndAge.name)).toBeDefined()
    });


    Deno.test ('Ctrl object should be able to remove Action', () => {
      Ctrl.removeAction("NameAndAge")
      expect(Ctrl.actions.has("NameAndAge")).toBeFalsy()
      expect(Ctrl.store.isRegistered("NameAndAge")).toBeFalsy()
      expect(Ctrl.graph.hasNode("NameAndAge")).toBeFalsy()
    }) 
{
  @action<F>({
    state: { name: 'Fidel', age: 85, sex: 'yoda' }
  })
  class NameAndAge extends Action<F> {
      
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

  Deno.test('It can set state parameters', () => {
      try {
        let nameAndAge = new NameAndAge('Fido', 5)
      }
      catch(e) {
        expect(e).toEqual('No Problemo')
      } 
  })

  Deno.test('The constructor state parameters are not overwritten', () => {
    let nameAndAge = new NameAndAge('Fido', 5)
    expect(nameAndAge.state.name).toEqual('Fido')
    expect(nameAndAge.state.age).toEqual(5)
    expect(nameAndAge.state.sex).toEqual('yoda')
  })
}

/*

class ObjA  extends Action<A> {constructor(_state: A ) {super(_state)}  ctrl():boolean { this.publish(); return true } }
class ObjA1 extends Action<A> {constructor(_state: A ) {super(_state)}  ctrl():boolean { this.publish(); return true } }
class ObjA2 extends Action<A> {constructor(_state: A ) {super(_state)}  ctrl():boolean { this.publish(); return true } }

class ObjA3 extends Action<A> {constructor(_state: A ) {super(_state)}
  
  updName ( prefix: string = '' ) {
    this.state.name = `A3:[]`
    this.publish() 
  }

  ctrl():boolean { 
    $log.debug(`Into OBJA3 ctrl()`)
    // this.updName()
    return true 
  } 
}

class ObjA4 extends Action<A> {constructor(_state: A, storeName: string, funcName: string ) {super(_state, storeName, funcName)}  
  
  updName ( prefix: string = '' ) {
    this.state.name = `A4:[]`
    this.publish() 
  }

  home():boolean { 
    this.updName()
    return true 
  } 
}

class ObjB  extends Action<B> { constructor(_state: B ) {super(_state)}
  ctrl():boolean {
      let stateD: Readonly<D> = Ctrl.getState('ObjD');
      this.state.name = stateD.name + "," + this.state.name
      this.publish()
      return true
  }
}
class ObjB1  extends Action<B> { constructor(_state: B ) {super(_state)}
  ctrl():boolean {
      let stateD: Readonly<D> = Ctrl.getState('ObjD1');
      this.state.name = stateD.name + "," + this.state.name
      this.publish()
      return true
  }
}

class ObjB2  extends Action<B> { constructor(_state: B ) {super(_state)}
  ctrl():boolean {
      let stateD: Readonly<D> = Ctrl.getState('ObjD2');
      this.state.name = stateD.name + "," + this.state.name
      this.publish()
      return true
  }
}

class ObjB3  extends Action<B> { constructor(_state: B ) {super(_state)}
  ctrl():boolean {
    $log.debug(`Into OBJB3 ctrl()`)
      let stateD: Readonly<D> = Ctrl.getState('ObjD3');
      this.state.name = `B3:[${stateD.name}]`
      this.publish()
      return true
  }
}
class ObjB4  extends Action<B> { constructor(_state: B ) {super(_state)}
  ctrl():boolean {
      let stateD: Readonly<D> = Ctrl.getState('ObjD4');
      this.state.name = `B4:[${stateD.name}]`
      this.publish()
      return true
  }
}

class ObjC  extends Action<C> { constructor(_state: C) { super(_state) }
    ctrl():boolean {
      let stateA: Readonly<A> = Ctrl.getState("ObjA");
      let stateB: Readonly<B> = Ctrl.getState("ObjB");
      this.state.name = stateA.name + "," + stateB.name + "," + this.state.name
      this.publish()
      return true
    }
  }

class ObjC1  extends Action<C> { constructor(_state: C) { super(_state) }
  ctrl():boolean {
    let stateA: Readonly<A> = Ctrl.getState("ObjA1");
    let stateB: Readonly<B> = Ctrl.getState("ObjB1");
    this.state.name = stateA.name + "," + stateB.name + "," + this.state.name
    this.publish()
    return true
  }
}

class ObjC2  extends Action<C> { constructor(_state: C) { super(_state) }
  ctrl():boolean {
    let stateA: Readonly<A> = Ctrl.getState("ObjA2");
    let stateB: Readonly<B> = Ctrl.getState("ObjB2");
    this.state.name = stateA.name + "," + stateB.name + "," + this.state.name
    this.publish()
    return true
  }
}

class ObjC3  extends Action<C> { constructor(_state: C) { super(_state) }

  updName ( prefix: string = '' ) {
    let stateA: Readonly<A> = Ctrl.getState("ObjA3");
    let stateB: Readonly<B> = Ctrl.getState("ObjB3");
    this.state.name = `${prefix}C3:[${stateA.name},${stateB.name}]`
  }

  ctrl():boolean {
    $log.debug(`Into OBJC3 ctrl()`)
    this.publish()
    return true
  }
}

class ObjC4  extends Action<C> { constructor(_state: C) { super(_state) }
  ctrl():boolean {
    $log.debug(`Into OBJC4 ctrl()`)
    let stateA: Readonly<A> = Ctrl.getState("ObjA4");
    let stateB: Readonly<B> = Ctrl.getState("ObjB4");
    this.state.name = `C4:[${stateA.name},${stateB.name}]`
    this.publish()
    return true
  }
}
 
  class ObjD  extends Action<D> { constructor(_state: D ) { super(_state) }
    ctrl():boolean {
      this.publish()
      return true
    }
  }

  class ObjD1  extends Action<D> { constructor(_state: D ) { super(_state) }
    ctrl():boolean {
      this.publish()
      return true
    }
  }

  class ObjD2  extends Action<D> { constructor(_state: D ) { super(_state) }
  ctrl():boolean {
    this.publish()
    return true
    }
  }

  class ObjD3  extends Action<D> { constructor(_state: D ) { super(_state) }
  ctrl():boolean {
    $log.debug(`Into OBJD4 ctrl()`)
    this.state.name = `D3:[]`
    this.publish()
    return true
    }
  }

  class ObjD4  extends Action<D> { constructor(_state: D ) { super(_state) }
  ctrl():boolean {
    $log.debug(`Into OBJD3 ctrl()`)
    this.state.name = `D4:[]`
    this.publish()
    return true
    }
  }

  /*
  let instA: ObjA
  let instB: ObjB
  let instC: ObjC
  let instD: ObjD

beforeEach(() => {
  Ctrl.removeAction('ObjA')
  Ctrl.removeAction('ObjB')
  Ctrl.removeAction('ObjC')
  Ctrl.removeAction('ObjD')
  instA = new ObjA({name: 'A', age:38 })
  instB = new ObjB({name: 'B', age:38 })
  instC = new ObjC({name: 'C', age:38 })
  instD = new ObjD({name: 'D', age:42 })
})
*/
 {   
    @action<A>({ ctrl: 'main', state:{name: 'A', age:38 }})
    class ObjA  extends Action<A> {  
      ctrl(): boolean { 
        this.publish();
        return true 
      } 
    }  
    let instA = new ObjA()
    
    @action<B>({ state:{name: 'B', age:38 }})
    class ObjB  extends ObjA {}  
    let instB = new ObjB()

    @action<C>({ state:{name: 'C', age:38 }})
    class ObjC  extends ObjA {}  
    let instC = new ObjC()
    
    Deno.test('Graph dependencies should preserve order', () => {
        let dependencies = instC.setDependencies('ObjA','ObjB')
        expect(dependencies).toEqual(['ObjA', 'ObjB'])
    })

    Deno.test('ctrl.getActionsToRun should return the run list', () => {
        // instC.setDependencies('ObjA','ObjB')
        let dep = Ctrl.getActionsToRun('ObjC')
        // console.log( 'DEBUG 1:' + inspect(dep) )
        expect(dep.size).toEqual(3)
        let storeId = Ctrl.store.getStoreId('ObjB')
        let B = dep.get('ObjB')!
        expect(Object.values(B)).toEqual( ['ObjB', '01.02', storeId, [] ] ) 
    })

    @action<D>({ state:{name: 'D', age:42 }})
    class ObjD  extends ObjA {}  
    let instD = new ObjD()


    Deno.test('ctrl.getActionsToRun should return a new changed run list', () => {
      // instC.setDependencies('ObjA','ObjB')
      instB.setDependencies('ObjD')
      let  dep = Ctrl.getActionsToRun('ObjC')
      // console.log( 'DEBUG 2:' + inspect(dep) )
      expect(dep.size).toEqual(4)
      let storeId = Ctrl.store.getStoreId('ObjB')
      let B = dep.get('ObjB')!
      expect(Object.values(B)).toEqual( ['ObjB', '01.02', storeId, ['ObjD'] ] ) 
      let C = dep.get('ObjC')!
      storeId = Ctrl.store.getStoreId('ObjC')
      expect(Object.values(C)).toEqual( ['ObjC', '01', storeId, [ 'ObjB', 'ObjA' ] ] ) 
    }) 
}
{
      @action<A>({ state:{name: 'A', age:38 }})
      class ObjA1  extends Action<A> {}
      @action<B>({ state:{name: 'B', age:38 }})
      class ObjB1  extends Action<A> {} 
      @action<C>({ state:{name: 'A', age:38 }})
      class ObjC1  extends Action<A> {} 
      @action<D>({ state:{name: 'A', age:38 }})
      class ObjD1  extends Action<A> {}


    let instA1 = new ObjA1()
    let instB1 = new ObjB1()
    let instC1 = new ObjC1()
    let instD1 = new ObjD1()

    Deno.test('Actions are removed', () => {
      Ctrl.removeAction('ObjA1')
      Ctrl.removeAction('ObjB1')
      Ctrl.removeAction('ObjC1')
      Ctrl.removeAction('ObjD1')
      expect(Ctrl.actions.has('ObjA1')).toBeFalsy()
      expect(Ctrl.actions.has('ObjB1')).toBeFalsy()
      expect(Ctrl.actions.has('ObjC1')).toBeFalsy()
      expect(Ctrl.actions.has('ObjD1')).toBeFalsy()
    })

    Deno.test('Store Entries are removed', () => {
      expect(Ctrl.store.has('ObjA1')).toBeFalsy()
      expect(Ctrl.store.has('ObjB1')).toBeFalsy()
      expect(Ctrl.store.has('ObjC1')).toBeFalsy()
      expect(Ctrl.store.has('ObjD1')).toBeFalsy()
    })
    Deno.test('Error Handling is as expected ', () => {
      // TODO: figure this one out -> expect(Ctrl.store.size).toEqual(0)
      try {
        Ctrl.graph.getNode('ObjA1')
      }
      catch(e) {
        expect(e.stack).toMatch(/not found/)
      }
    })
    Deno.test('Error Ctrl can add the same named classes back in again', () => {
      let instA1 = new ObjA1()
      let instB1 = new ObjB1()
      let instC1 = new ObjC1()
      let instD1 = new ObjD1()
      expect(Ctrl.actions.has('ObjA1')).toBeTruthy()
      expect(Ctrl.actions.has('ObjB1')).toBeTruthy()
      expect(Ctrl.actions.has('ObjC1')).toBeTruthy()
      expect(Ctrl.actions.has('ObjD1')).toBeTruthy()
    })
  }

{
    @action<A>({ state:{name: 'A', age:38 }})
    class ObjA2  extends Action<A> {}

    @action<B>({ state: {name: 'B', age:38 } })
    class ObjB2  extends Action<B> {
      ctrl(): boolean {
          let stateD: Readonly<D> = Ctrl.getState('ObjD2');
          this.state.name = stateD.name + "," + this.state.name
          this.publish()
          return true
      }
    }

    @action<C>({ state: {name: 'C', age:38 } })
    class ObjC2  extends Action<C> {
      ctrl(): boolean {
        let stateA: Readonly<A> = Ctrl.getState("ObjA2");
        let stateB: Readonly<B> = Ctrl.getState("ObjB2");
        this.state.name = stateA.name + "," + stateB.name + "," + this.state.name
        this.publish()
        return true
      }
    }

    @action<D>({ state: {name: 'D', age:38 } })
    class ObjD2  extends Action<D> {
      ctrl(): boolean {
        this.publish()
        return true
      }
    }
    let instA2 = new ObjA2()
    let instB2 = new ObjB2()
    let instC2 = new ObjC2()
    
    Deno.test('Graph multiple dependencies should preserve order', () => {
        let dependencies = instC2.setDependencies('ObjA2','ObjB2')
        expect(dependencies).toEqual(['ObjA2', 'ObjB2'])
    })

    Deno. test('ctrl.getActionsToRun should return the run list', () => {
        // instC.setDependencies('ObjA','ObjB')
        let dep = Ctrl.getActionsToRun('ObjC2')
        // console.log( 'DEBUG 1:' + inspect(dep) )
        expect(dep.size).toEqual(3)
        let storeId = Ctrl.store.getStoreId('ObjB2')
        let B = dep.get('ObjB2')!
        expect(Object.values(B)).toEqual( ['ObjB2', '01.02', storeId, [] ] ) 
    })

    let instD2 = new ObjD2()
    Deno.test('ctrl.getActionsToRun should return a new changed run list', () => {
      // instC.setDependencies('ObjA','ObjB')
      instB2.setDependencies('ObjD2')
      let  dep = Ctrl.getActionsToRun('ObjC2')
      // console.log( 'DEBUG 2:' + inspect(dep) )
      expect(dep.size).toEqual(4)
      let storeId = Ctrl.store.getStoreId('ObjB2')
      let B = dep.get('ObjB2')!
      // Note: the padded hierarchy number in the tests below may change
      // if a number of the above classes are removed, e.g. to 1.2 instead
      expect(Object.values(B)).toEqual( ['ObjB2', '01.02', storeId, ['ObjD2'] ] ) 
      let C = dep.get('ObjC2')!
      storeId = Ctrl.store.getStoreId('ObjC2')
      expect(Object.values(C)).toEqual( ['ObjC2', '01', storeId, [ 'ObjB2', 'ObjA2' ] ] ) 
    }) 
 }
 {

  @action<A>({ state:{name: 'A', age:38 }})
  class ObjA3  extends Action<A> {
    updName ( prefix: string = '' ) {
      this.state.name = `A3:[]`
      this.publish() 
    }
    ctrl(): boolean {
      // this.state.name = 'A3:[]'
      this.publish()
      return true
    } 
  }

  @action<B>({ state: {name: 'B', age:38 } })
  class ObjB3  extends Action<B> {
    ctrl(): boolean {
        let stateD: Readonly<D> = Ctrl.getState('ObjD3');
        this.state.name = `B3:[${stateD.name}]`
        this.publish()
        return true
    }
  }

  @action<C>({ state: {name: 'C', age:38 } })
  class ObjC3  extends Action<C> {
    updName ( prefix: string = '' ) {
      let stateA: Readonly<A> = Ctrl.getState("ObjA3");
      let stateB: Readonly<B> = Ctrl.getState("ObjB3");
      this.state.name = `${prefix}C3:[${stateA.name},${stateB.name}]`
    }
  
    ctrl(): boolean {
      this.publish()
      return true
    }
  }

  @action<D>({ state: {name: 'D', age:38 } })
  class ObjD3  extends Action<D> {
    ctrl(): boolean {
      this.state.name = 'D3:[]'
      this.publish()
      return true
    }
  }
  
  let instA3 = new ObjA3()
  let instB3 = new ObjB3()
  let instC3 = new ObjC3()
  let instD3 = new ObjD3()
  
  let deps2 = instB3.setDependencies('ObjD3')
  let deps = instC3.setDependencies('ObjA3','ObjB3')
  

  Deno.test( 'Correct Dependencies before Running execution test', () => {
    expect(deps2).toEqual(['ObjD3']) 
    expect(deps).toEqual(['ObjA3', 'ObjB3'])
  })
  

  Deno.test('It should RUN a ctrl()', () => {
    expect(Ctrl.runTarget('ObjD3')).toBeTruthy()
    expect(instD3.state.name).toEqual('D3:[]')
    expect(Ctrl.runTarget('ObjA3')).toBeTruthy()
    expect(instA3.state.name).toEqual('A')
  })


  Deno.test('It should RUN Dependencies', () => {
    expect(Ctrl.runTarget('ObjB3')).toBeTruthy()
    expect(instB3.state.name).toEqual('B3:[D3:[]]')
  })
      
  Deno.test('It should RUN the Dependencies in order', () => {
        instA3.updName()
        $log.info('A3.state.name: ' + instA3.state.name)
        instC3.updName()
        expect(Ctrl.runTarget('ObjC3')).toBeTruthy()
        expect(instC3.state.name).toEqual('C3:[A3:[],B3:[D3:[]]]')
    })

    Deno.test('It should RERUN after a change', () => {
      instA3.state.name = 'Second Run: ' + instA3.state.name
      instA3.publish()
      instC3.updName( 'Second Run: ' )
      expect(Ctrl.runTarget("ObjC3")).toBeTruthy()
      expect(instC3.state.name).toEqual('Second Run: C3:[Second Run: A3:[],B3:[D3:[]]]')
    })

    /*
    test('It should RUN the Dependants in order', () => {
        instC.state.name = 'C3'
        instA.state.name = 'A3'
        instA.publish()
        expect(Ctrl.runDependants("ObjA")).toBeTruthy()
        expect(instC.state.name).toEqual('A3,D,B,C3')
    })
    */ 

}


{

  @action<A>( { state: {name: 'A', age:38 }, name: 'OA4', ctrl: 'home' } )
  class ObjA4 extends Action<A> {
    
    updName ( prefix: string = '' ) {
      this.state.name = `${prefix}A4:[]`
      this.publish() 
    }

    home():boolean { 
      return true 
    } 
  }
  let instA4 = new ObjA4()

  @action<B>( { state: {name: 'B', age:38 }, name: 'OB4' } )
  class ObjB4  extends Action<B> { 
    ctrl():boolean {
        let stateD: Readonly<D> = Ctrl.getState('OD4');
        this.state.name = `B4:[${stateD.name}]`
        this.publish()
        return true
    }
  }

  let instB4 = new ObjB4()

  @action<C>({ state: {name: 'C', age:38 }, name: 'OC4', ctrl: 'main'  } ) 
  class ObjC4  extends Action<C> { 
    updName ( prefix: string = '' ) {
      let stateA: Readonly<A> = Ctrl.getState("OA4");
      let stateB: Readonly<B> = Ctrl.getState("OB4");
      this.state.name = `${prefix}C4:[${stateA.name},${stateB.name}]`
      this.publish()
    }

    main():boolean {
      this.updName()
      return true
    }
  }
  let instC4 = new ObjC4()

  @action<D>({ state: {name: 'D4:[]', age:38 }, name: 'OD4', ctrl: 'dada' } ) 
  class ObjD4  extends Action<D> {

    updName ( prefix: string = '' ) {
      this.state.name = `${prefix}D4:[]`
      this.publish() 
    }
    
    dada():boolean { 
      return true
    }
  }

  let instD4 = new ObjD4()
  
  let deps2 = instB4.setDependencies('OD4')
  let deps = instC4.setDependencies('OA4','OB4')
  

  Deno.test( 'Correct Dependencies before Running execution test', () => {
    expect(deps2).toEqual(['OD4']) 
    expect(deps).toEqual(['OA4', 'OB4'])
  })
  
  Deno.test('It should RUN Dependencies', () => {
    expect(Ctrl.runTarget('OB4')).toBeTruthy()
    expect(instB4.state.name).toEqual('B4:[D4:[]]')
  })
      
  Deno.test('It should RUN the Dependencies in order', () => {
        instA4.updName()
        instD4.updName('again-')
        expect(Ctrl.runTarget('OC4')).toBeTruthy()
        expect(instC4.state.name).toEqual('C4:[A4:[],B4:[again-D4:[]]]')
    })

  Deno.test('It should RERUN after a change', () => {
      instA4.updName('Yet again-')
      instD4.updName('Yet again-')
      expect(Ctrl.runTarget("OC4")).toBeTruthy()
      expect(instC4.state.name).toEqual('C4:[Yet again-A4:[],B4:[Yet again-D4:[]]]')
    })

    /*
    test('It should RUN the Dependants in order', () => {
        instC.state.name = 'C3'
        instA.state.name = 'A3'
        instA.publish()
        expect(Ctrl.runDependants("ObjA")).toBeTruthy()
        expect(instC.state.name).toEqual('A3,D,B,C3')
    })
    */ 
  }
