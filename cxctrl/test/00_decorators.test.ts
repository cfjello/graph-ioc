import * as  Ctrl from '../Ctrl.ts'
import { Action } from '../Action.ts'
import { action } from '../decorators/mod.ts'
import { $plog, perf } from '../../cxutil/mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'
import * as _ from "https://deno.land/x/lodash@4.17.19/lodash.js"
// import {inspect } from 'util'
// import isUndefined from "https://deno.land/x/lodash/isUndefined.js"
// import uniq from "https://deno.land/x/lodash/uniq.js"
// import union from "https://deno.land/x/lodash/union.js"

type A = {gender:string, age: number} 
type B = {gender:string, age: number}
type C = {gender:string, age: number}
type D = {gender:string, age: number}

@action<A>( {
  name: 'Young',
  ctrl: 'main',
  state: { gender: 'male', age: 13}, 
  init: true
})
class OA extends Action<A> {
  constructor( public preferGenderName: string = 'ey' ) {
      super()
      console.debug(`Running OA Constructor`)
  }

  main():void { 
    this.state.gender = this.preferGenderName
    this.publish()
  } 
}

let objA = await new OA('hirs').register()

Deno.test('00 - Action decorator: It should decorate and intialize an Action', () => {
  expect(objA.state.gender).toBeDefined()
  expect(objA.state.gender).toEqual('male')
  expect(objA.meta.name).toBeDefined()
  expect(objA.meta.name).toEqual('Young')
  expect(objA.setDependencies).toBeDefined()
  // expect(typeof objA.register).toEqual('function')
  expect(objA.ping()).toEqual('action decorator ping() has been called')
})

Deno.test('00 - Action decorator: Register should initialize in the Ctrl structure', () => {
  // perf.listPerfMap()
  expect(Ctrl.actions.has('Young')).toBeTruthy()
  expect(Ctrl.store.get('Young')).toBeDefined()
  let storedYoung = Ctrl.getState('Young', -1)
  expect( storedYoung ).toEqual(objA.state)
  // expect(true).toBeTruthy()
})


 @action<A>( {
  name: 'Old',
  ctrl: 'ctrl',
  state: { gender: 'female', age: 85}, 
  init: true
})
class OB extends OA {
  constructor(public preferGenderName: string) {
    super(preferGenderName)
    console.debug(`Running OB extends OA Constructor`)
  }
}

console.log ('---------------------------------------')
let objB = await new OB('hirs').register()

    Deno.test('00 - Extended class should intialize the new Action instance', () => {
      expect(objB.state.gender).toBeDefined()
      expect(objB.state.gender).toEqual('female')
      expect(objB.meta.name).toBeDefined()
      expect(objB.meta.name).toEqual('Old')
      expect(objB.setDependencies).toBeDefined()
      expect(objB.ping()).toEqual('action decorator ping() has been called')
    })

  
    Deno.test('00 - Extended class  should initialize in the Ctrl structure', () => {
      expect(Ctrl.actions.has('Old')).toBeTruthy()
      expect(Ctrl.store.get('Old')).toBeDefined()
      expect(Ctrl.getState('Old', -1)).toEqual(objB.state)
    })

    Deno.test('00 - The Parent class should not have been changed', () => {
      expect(Ctrl.getState('Young', -1)).toEqual(objA.state)
    })

@action<A>( {
  name: 'OverTheHill',
  ctrl: 'ctrl',
  state: { gender: 'trans', age: 117}, init: true
})
class OC extends OB {
  constructor(public preferGenderName: string) {
    super(preferGenderName)
    console.log('Running OC extends OB Class constructor')
  }
}
console.log ('---------------------------------------')
let objC = await new OC('aunty').register()

// describe('2nd Extended class should apply the configuration',  () => {
  Deno.test('00 - Extended class should intialize the new Action instance', () => {
    expect(objC.state.gender).toBeDefined()
    expect(objC.state.gender).toEqual('trans')
    expect(objC.meta.name).toBeDefined()
    expect(objC.meta.name).toEqual('OverTheHill')
    expect(objC.preferGenderName).toEqual('aunty')
    expect(objC.setDependencies).toBeDefined()
    expect(objC.ping()).toEqual('action decorator ping() has been called')
    //expect (objC.preferGenderName).toBeDefined()
  })


  Deno.test('00 - 1st Extended class should initialize in the Ctrl structure', () => {
    expect(Ctrl.getState('Old', -1)).toEqual(objB.state)
  })

  Deno.test('00 - The initial Parent class should not have been changed', () => {
    expect(Ctrl.getState('Young', -1)).toEqual(objA.state)
  })


  {
    @action<A>( {
        name: 'Young',
        ctrl: 'main',
        state: { gender: 'male', age: 13}, 
        init: true
    })
    class OA2 extends Action<A> {
        constructor( state: A = {} as A, public preferGenderName: string = 'ey' ) {
            super(state)
        }
    
        main():void { 
        this.state.gender = this.preferGenderName
        this.publish()
        } 
    }
    
    let instOA2 = await new OA2( {gender: 'female', age: 23}, 'hirs' ).register()
    let instOA2B = await new OA2().register('Younger')
    
    Deno.test( {
      name: '00 - Instance State set via the constructor overwrites decorator configuration', 
      fn: async () => {
          expect(instOA2.meta).toBeDefined()
          expect(instOA2.meta.funcName).toEqual('main')
          expect(instOA2.meta.name).toEqual('Young')
          expect(instOA2.meta.className).toEqual('OA2')
      },
      sanitizeResources: false,
      sanitizeOps: false
        })
    Deno.test( {
      name: '00 - Instance meta data Name can be set via the Register(name) call', 
      fn: async () => {
          expect(instOA2B.meta).toBeDefined()
          expect(instOA2B.meta.funcName).toEqual('main')
          expect(instOA2B.meta.name).toEqual('Younger')
          expect(instOA2B.meta.className).toEqual('OA2')
      },
      sanitizeResources: false,
      sanitizeOps: false
      })
  

    Deno.test( {
      name: '00 - Instance data should be set correctly', 
      fn: async () => {
          expect(instOA2.state).toBeDefined()
          expect(instOA2.state.gender).toEqual('female')
          expect(instOA2.state.age).toEqual(23)
          expect(instOA2.preferGenderName).toEqual('hirs')
          expect(instOA2B.state).toBeDefined()
          expect(instOA2B.state.gender).toEqual('male')
          expect(instOA2B.state.age).toEqual(13)
          expect(instOA2B.preferGenderName).toEqual('ey')
      },
      sanitizeResources: false,
      sanitizeOps: false
      })
  }
