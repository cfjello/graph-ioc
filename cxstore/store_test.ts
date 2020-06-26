import { CxStore } from './mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'

class NameAndAge {
    constructor( public state: any ) { this.state = state }
    nameAndAge () { console.log( JSON.stringify(this.state)) }
}

let store = new CxStore()

    Deno.test('Store: It should intialize the store object', () => {
        let state = store.getState()
        expect(state).toBeDefined()
        let meta = store.getMeta()
        expect(meta).toBeDefined()
    })

    type C = { f1: string, f2: string }
    Deno.test('Store: It should add to the store object', async () => {
        // let state = store.getState()
        // let meta = store.getMeta()
        let context  = { f1: 'field_1', f2: 'field_2'}
        let storeId = await store.register('testContext', context)
        expect(storeId).toBeDefined()
        expect(context).toBeDefined()
        expect(context.f1).toEqual('field_1')
        expect( store.hasStoreId('testContext', storeId)).toBe(true)
        expect( (store.get('testContext',storeId) as C).f1).toEqual('field_1')
        expect( store.hasStoreId('testContext', 22222)).toBe(false)
    })

    Deno.test('Store: It should remove a Store object', async () => {

        let state = store.getState();
        expect( state.get('testContext') ).toBeDefined()
        expect(store.size).toEqual(1)

        let context2: C  = { f1: 'field_1', f2: 'field_2'}
        await store.register('testContext2', context2)
        expect(store.size).toEqual(2)

        let context3: C  = { f1: 'field_1', f2: 'field_2'}
        await store.register('testContext3', context3)
        expect(store.size).toEqual(3)

        await store.unregister('testContext3')
        expect(store.size).toEqual(2)

        await store.unregister('testContext2')
        expect(store.size).toEqual(1)

        await store.unregister('testContext')
        expect(store.size).toEqual(0)

        await expect ( state.has('testContext') ).toBeFalsy()
        expect( state.get('testContext') ).toBeUndefined()
    })

    Deno.test('Store: It should publish in Store only when there is a change', async () => {
        
        let nameAndAge = new NameAndAge({name: 'Benny', age:38 })
        await store.register("NameAndAge", nameAndAge.state)
        await store.set("NameAndAge", nameAndAge.state)

        let storeId = store.getStoreId("NameAndAge")
        await expect(storeId).toBeGreaterThan(-1)

        await store.set("NameAndAge", nameAndAge.state) 
        await store.set("NameAndAge", nameAndAge.state) 
        await store.set("NameAndAge", nameAndAge.state)

        storeId = store.getStoreId("NameAndAge")
        expect(store.getStoreId("NameAndAge")).toEqual(storeId)

        // Now update
        nameAndAge.state.age = 40;
        await store.set("NameAndAge", nameAndAge.state)
        expect(store.getStoreId("NameAndAge")).toEqual(storeId + 1)

        await store.set("NameAndAge", nameAndAge.state) 
        expect(store.getStoreId("NameAndAge")).toEqual(storeId + 1)
    })

    Deno.test('Store: It should delete colection entries according to treshold', async () => {
        
        let nameAndAge2 = new NameAndAge({name: 'Benny', age:38 })
        let storeId_1 = await store.register("NameAndAge2", nameAndAge2.state, 2 )
        expect(store.getStoreId('NameAndAge2', storeId_1)).toEqual(storeId_1)
        // Now update
        nameAndAge2.state.name = "Bunny"
        nameAndAge2.state.age  = 18
        let storeId_2 = await store.set("NameAndAge2", nameAndAge2.state)
        expect(store.getStoreId('NameAndAge2', storeId_2)).toEqual(storeId_2)
        // Now update
        nameAndAge2.state.name = "Sunny"
        nameAndAge2.state.age  = 24
        let storeId_3= await store.set("NameAndAge2", nameAndAge2.state)
        expect(store.getStoreId('NameAndAge2', storeId_3)).toEqual(storeId_3)
        expect(store.getStoreId('NameAndAge2', storeId_2)).toEqual(storeId_2)
        expect(store.getStoreId('NameAndAge2', storeId_1)).toEqual(-1)
        // Now update
        nameAndAge2.state.name = "Macarony"
        nameAndAge2.state.age  = 312
        let storeId_4 = await store.set("NameAndAge2", nameAndAge2.state)
        expect(store.getStoreId('NameAndAge2', storeId_4)).toEqual(storeId_4)
        expect(store.getStoreId('NameAndAge2', storeId_3)).toEqual(storeId_3)
        expect(store.getStoreId('NameAndAge2', storeId_2)).toEqual(-1)
    })

    Deno.test('Store: It can do error handling', () => {
            expect(store.getStoreId('NameAndAge', 222)).toEqual(-1)          
            let storeId = store.getStoreId("NameAndAge")
            try { store.getStoreId('Non_Existing_NameAndAge', storeId) }
            catch(e) { expect(e.stack).toMatch(/does not exist/m) }
    })