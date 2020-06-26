import { CxStore } from './mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'

let store = new CxStore()
let storeIds: number[] = []
for( let i = 0 ; i < 20 ; i++ ) {
    storeIds[i] = store.register( `data_${i}`, { f1: `data_${i}_field_1`, f2: `data_${i}_field_2`} )
}

    Deno.test('Latches: It should lock an object', () => {
        store.setLatch(10).then( (res) => {
            expect(store.getLatch(10)).toBe(true)
            expect(store.getLatch('data_10')).toBe(true)
            expect(res).toEqual(0)
        })     
        
    })

    Deno.test('Latches: It should clear a lock on an object', () => {
        store.clearLatch(10)       
        expect(store.getLatch(10)).toBe(false)
    })
    

    Deno.test('Latches: It should wait for a lock', async () => {
        store.setLatch(12).then( (res) => {
            expect(res).toEqual(0)    
            expect(store.getLatch(12)).toBe(true)
            setTimeout( () => {store.clearLatch(12) }, 50 )
            store.setLatch(12).then((res) => {
                expect(res).toBeGreaterThan(4)
            })  
        })
    })

    Deno.test('Latches: Trying to obtian an already set data lock should time out', () => {
        store.setLatch(15).then( async () => {
            try {
                await store.setLatch(15)
            }
            catch(e) {
                expect(e.stack).toMatch(/timed out while waiting for data latch/)
                store.clearLatch(15) 
            }
        }) 
    })
    

    Deno.test('Latches: Trying to obtian an already set master lock should time out', () => {
        store.setLatch(0).then ( async () => {
            try {
                await store.setLatches(['data_5','data_6']) 
            }
            catch(e) {
                expect(e.stack).toMatch(/timed out while waiting for master latch/)
                store.clearLatch(0) 
            }
        })   
    })