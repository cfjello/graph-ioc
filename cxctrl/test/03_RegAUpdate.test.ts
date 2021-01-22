import {ctrl, Action, action } from '../mod.ts'
import { $log, $plog } from '../../cxutil/mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'
import { CHAR_QUESTION_MARK } from "https://deno.land/std@0.74.0/path/_constants.ts"

type testFuncModel = { arg1:string, arg2:string }
type A = {name:string, age: number} 
type F = {firstName:string, lastName:string, job: string, age: number, sex: string}

//
// Leaf notes are initialized by:
// - their supplied initial action state object
// - their constructor
// - an init function
//
{
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

    Deno.test('03 - Action Object should register under the default name', () => {
        // console.log(`nameAndAge.meta.className!: ${nameAndAge.meta.className!}`)
        expect(nameAndAge.meta.className!).toEqual("NameAndAge")
        expect(ctrl.store.isRegistered(nameAndAge.meta.className!)).toBeTruthy()
      
    })

    let nameAndAge2: NameAndAge = await new NameAndAge().register('OtherName')

    Deno.test( {
        name: '03 - Action Object should register under a new Name supplied in the register() call', 
        fn: async () => {
            expect(nameAndAge2.meta.className!).toEqual("NameAndAge")
            expect(nameAndAge2.meta.name!).toEqual('OtherName')
            expect(ctrl.store.isRegistered(nameAndAge2.meta.name!)).toBeTruthy()
            let state = ctrl.getState('OtherName')
            expect(state.name).toEqual('Fidel')
            expect(state.age).toEqual(-1)
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

}

{
    @action<F>({
        name: 'Fidel',
        state: {firstName: 'Fidel', lastName: 'McDonald', job: 'President', age: 90, sex:'yes' },
        init: true
        })
        class NameAndAge3 extends Action<F> {
            constructor() {
                super()
            }
            main = async (): Promise<boolean> => { 
                this.update( { lastName: 'Castro', age: 108, job: 'Deceaced'})
                this.publish()
                return true
            }

            nameAndAge = () => { console.log( JSON.stringify(this.state)) }
        }
        
        let nameAndAge3: NameAndAge3 = await new NameAndAge3().register()
        let res = await nameAndAge3.main()

        Deno.test( {
            name: '03 - Instance State can be updated via "update" using a Patial of the action type', 
            fn: async () => {
                expect(res).toEqual(true)
                expect(nameAndAge3.state.lastName).toEqual('Castro')
                expect(nameAndAge3.state.job).toEqual('Deceaced')
                expect(nameAndAge3.state.age).toEqual(108)
                let state = ctrl.getState('Fidel')
                expect(state.lastName).toEqual('Castro')
                expect(state.job).toEqual('Deceaced')
                expect(state.age).toEqual(108)
            },
            sanitizeResources: false,
            sanitizeOps: false
        })
}