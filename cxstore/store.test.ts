import { store  } from './mod.ts'
import { expect } from 'https://deno.land/x/expect/mod.ts'
import strictIndexOf from "https://raw.githubusercontent.com/lodash/lodash/master/.internal/strictIndexOf.js"

class NameAndAge {
    public state: any
    constructor( _state: any ) { this.state = _state }
    nameAndAge () { console.log( JSON.stringify(this.state)) }
}

type C_Type = { f1: string, f2: string, jobId: number, taskId: number }

    Deno.test({
        name: 'Store: It should intialize the store object', 
        fn: () => {
            expect(store.getState()).toBeDefined()
            expect(store.getMeta()).toBeDefined()
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

    Deno.test( {
        name: 'Store: It should add to the store object', 
        fn: async () => {
            let context  = { f1: 'field_1', f2: 'field_2', jobId: -1 , taskId: -1 }
            await store.register('testContext', context )
            let storeId =  store.getStoreId('testContext')
            expect(storeId).toBeDefined()
            expect(context).toBeDefined()
            expect(context.f1).toEqual('field_1')
            expect( store.hasStoreId('testContext', storeId)).toBe(true)
            expect( (store.get('testContext',storeId) as C_Type).f1).toEqual('field_1')
            expect( store.hasStoreId('testContext', 22222)).toBe(false)
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

    Deno.test({
        name: 'Store: It should register Store objects', 
        fn: async () => {
            let state = store.getState();
            expect( state.get('testContext') ).toBeDefined()
            expect(store.size()).toEqual(1)

            
            let context2: C_Type  = { f1: 'field_1', f2: 'field_2', jobId: -1 , taskId: -1 }
            await store.register('testContext2', context2)
            expect(store.size()).toEqual(2)
        

            let context3: C_Type  = { f1: 'field_1', f2: 'field_2', jobId: -1 , taskId: -1 }
            await store.register('testContext3', context3)
            expect(store.size()).toEqual(3)
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

    Deno.test({
        name: 'Store: It should remove a Store object', 
        fn: async () => {
            
            await store.unregister('testContext3').then((ret) => {
                expect(ret).toEqual(true)
                expect(store.has('testContext3')).toBeFalsy()
                expect(store.size()).toEqual(2)
            })
            
            await store.unregister('testContext2').then((ret) => {
                expect(ret).toEqual(true)
                expect(store.has('testContext2')).toBeFalsy()
                expect(store.size()).toEqual(1)
            })
            
            await store.unregister('testContext').then((ret) => {
                expect(ret).toEqual(true)
                // expect(store.size()).toEqual(0)
                expect ( store.has('testContext') ).toBeFalsy()
                // expect( store.get('testContext') ).toBeUndefined()
            })
    
        },
        sanitizeResources: false,
        sanitizeOps: false
    })
    /*
    /* Dropped this feature due to the merge into of the fields jobid, taskId, storeId, that are always different
    /* potentially giving the compare before insert a bad performance
    /*
    Deno.test( {
        name: 'Store: It should publish in Store only when there is a change', 
        fn: async () => {
        
            let nameAndAge = new NameAndAge({name: 'Benny', age:38 })
            await store.register("NameAndAge", nameAndAge.state)
            await store.set("NameAndAge", nameAndAge.state)

            let storeId = store.getStoreId("NameAndAge")
            expect(storeId).toBeGreaterThan(-1)
            //
            // Setting same values a second time
            // 
            await store.set("NameAndAge", nameAndAge.state) 
            await store.set("NameAndAge", nameAndAge.state) 
            await store.set("NameAndAge", nameAndAge.state)

            // storeId = store.getStoreId("NameAndAge")
            expect(store.getStoreId("NameAndAge")).toEqual(storeId)

            // Now update
            nameAndAge.state.age = 40;
            await store.set("NameAndAge", nameAndAge.state)
            expect(store.getStoreId("NameAndAge")).toEqual(storeId + 1)

            await store.set("NameAndAge", nameAndAge.state) 
            expect(store.getStoreId("NameAndAge")).toEqual(storeId + 1)
        },
        sanitizeResources: false,
        sanitizeOps: false
    })
    */

    Deno.test({
        name: 'Store: It should delete collection entries according to treshold', 
        fn: async () => {
            let nameAndAge2 = new NameAndAge({name: 'Benny', age:38,  jobId: -1 , taskId: -1 })
            let storeId_1 = await store.register("NameAndAge2", nameAndAge2.state, 2 ) // Store with treshold
            console.log(`storeId_1 = ${storeId_1}`)
            // let storeId_1 = store.getStoreId("NameAndAge2")
            expect(store.getStoreId('NameAndAge2')).toEqual(storeId_1)
            expect(store.getStoreId('NameAndAge2', storeId_1)).toEqual(storeId_1)
            // Now update
            nameAndAge2.state.name = "Bunny"
            nameAndAge2.state.age  = 18
            let storeId_2 = await store.set("NameAndAge2", nameAndAge2.state, -1 , undefined)
            // let storeId_2 = store.getStoreId("NameAndAge2")
            expect(storeId_2).toEqual(storeId_1 + 1)
            /*
            // Now update
            nameAndAge2.state.name = "Sunny"
            nameAndAge2.state.age  = 24
            store.set("NameAndAge2", nameAndAge2.state)
            expect(store.getStoreId('NameAndAge2')).toEqual(storeId_1)
            expect(store.getStoreId('NameAndAge2', storeId_1)).toEqual(-1)
            // Now update
            nameAndAge2.state.name = "Macarony"
            nameAndAge2.state.age  = 312
            let storeId_4 =  store.set("NameAndAge2", nameAndAge2.state)
            expect(store.getStoreId('NameAndAge2', storeId_4)).toEqual(storeId_4)
            expect(store.getStoreId('NameAndAge2', storeId_3)).toEqual(storeId_3)
            expect(store.getStoreId('NameAndAge2', storeId_2)).toEqual(-1)
            */
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

    Deno.test( {
        name: 'Store: It can do error handling', 
        fn: async () => {
            let nameAndAge3 = new NameAndAge({name: 'Benny', age:38 })
            await store.register("NameAndAge3", nameAndAge3.state)
            expect(store.getStoreId('NameAndAge3', 222)).toEqual(-1)          
            let storeId = store.getStoreId("NameAndAge3")
            try { 
                store.getStoreId('Non_Existing_NameAndAge', storeId) 
            }
            catch(e) { 
                expect(e.stack).toMatch(/does not exist/m) 
            }
        },
        sanitizeResources: false,
        sanitizeOps: false
    })