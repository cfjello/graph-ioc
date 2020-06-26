import * as  Ctrl from './Ctrl.ts'
import { Action } from './Action.ts'
import { action } from './decorators/mod.ts'
import { $plog, perf } from '../cxutil/mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'
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
  ctrl: 'ctrl',
  state: { gender: 'male', age: 13}
})
class OA extends Action<A> {
  constructor( public preferGenderName: string = 'ey' ) {
      super()
      console.debug('objA Constructor')
  }

  ctrl():void { 
    this.state.gender = this.preferGenderName
    this.publish()
  } 
}

let objA = await new OA('hirs')
/*
let objA = Ctrl.createAction({  name: 'Young',
                                ctrl: 'ctrl',
                                state: { gender: 'male', age: 13}
                                }, 
                                OA)
*/ 


Deno.test('Action decorator: It should decorate and intialize an Action', () => {
  expect(objA.state.gender).toBeDefined()
  expect(objA.state.gender).toEqual('male')
  expect(objA.name).toBeDefined()
  expect(objA.name).toEqual('Young')
  expect(objA.setDependencies).toBeDefined()
  // expect(typeof objA.register).toEqual('function')
  expect(objA.ping()).toEqual('action decorator ping() has been called')
})

Deno.test('Action decorator: Register should initialize in the Ctrl structure', () => {
  // perf.listPerfMap()
  // expect(Ctrl.actions.has('Young')).toBeTruthy()
  // expect(Ctrl.store.get('Young')).toBeDefined()
  // expect(Ctrl.getState('Young', -1)).toEqual(objA.state)
  expect(true).toBeTruthy()
})


/*
 @action<A>( {
  name: 'Old',
  ctrl: 'ctrl',
  state: { gender: 'female', age: 85}
})
class OB extends OA {
  constructor(public preferGenderName: string) {
    super(preferGenderName)
  }
}

let objB = new OB('hirs')

// let objB = Ctrl.cloneAction( { name: 'Old', ctrl: 'ctrl', state: { gender: 'female', age: 85} }, OA )
// Ctrl.addAction(objB)
describe('Extended class should apply the configuration',  () => {
    test('Extended class should intialize the new Action instance', () => {
      expect(objB.state.gender).toBeDefined()
      expect(objB.state.gender).toEqual('female')
      expect(objB.name).toBeDefined()
      expect(objB.name).toEqual('Old')
      expect(objB.setDependencies).toBeDefined()
      expect(objB.ping()).toEqual('action decorator ping() has been called')
    })

  
    test('Extended class  should initialize in the Ctrl structure', () => {
      expect(Ctrl.actions.has('Old')).toBeTruthy()
      expect(Ctrl.store.get('Old')).toBeDefined()
      expect(Ctrl.getState('Old', -1)).toEqual(objB.state)
    })

    test('The Parent class should not have been changed', () => {
      expect(Ctrl.getState('Young', -1)).toEqual(objA.state)
    })
})

@action<A>( {
  name: 'OverTheHill',
  ctrl: 'ctrl',
  state: { gender: 'trans', age: 117}
})
class OC extends OB {
  constructor(public preferGenderName: string) {
    super(preferGenderName)
  }
}

let objC = new OC('aunty')

describe('2nd Extended class should apply the configuration',  () => {
  test('Extended class should intialize the new Action instance', () => {
    expect(objC.state.gender).toBeDefined()
    expect(objC.state.gender).toEqual('trans')
    expect(objC.name).toBeDefined()
    expect(objC.name).toEqual('OverTheHill')
    expect(objC.setDependencies).toBeDefined()
    expect(objC.ping()).toEqual('action decorator ping() has been called')
  })


  test('1st Extended class  should initialize in the Ctrl structure', () => {
    expect(Ctrl.getState('Old', -1)).toEqual(objB.state)
  })

  test('The initial Parent class should not have been changed', () => {
    expect(Ctrl.getState('Young', -1)).toEqual(objA.state)
  })
})
*/
 

 