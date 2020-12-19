import {ctrl, Action, action } from '../mod.ts'
import { $log, $plog } from '../../cxutil/mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'

type testFuncModel = { arg1:string, arg2:string }
type A = {name:string, age: number} 
type B = {name:string, age: number}
type C = {name:string, age: number}
type D = {name:string, age: number}
type F = {name?:string, age?: number, sex?: string}


//
// Leaf notes are initialized by:
// - their supplied initial action state object
// - their constructor
// - an init function
//
@action<A>({
    state: {name: 'Fidel', age: -1},
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
 
  let nameAndAge: NameAndAge = await new NameAndAge().register()
  // console.log(`NAA constructor name: ${nameAndAge2.constructor.name}`)

  Deno.test('03 - Action Object should register under the default name', () => {
    // console.log(`nameAndAge.meta.className!: ${nameAndAge.meta.className!}`)
    expect(nameAndAge.meta.className!).toEqual("NameAndAge")
    expect(ctrl.store.isRegistered(nameAndAge.meta.className!)).toBeTruthy()
      
})

