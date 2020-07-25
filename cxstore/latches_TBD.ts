import { latches } from './mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'

// let store = new CxStore()
// let storeIds: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']


    Deno.test( {
        name: 'Latches: It should lock an object', 
        fn: () => {
            latches.setLatch('A', true).then( (res) => {
                expect(latches.getLatch('A')).toBe(true)
                // expect(store.getLatch('data_10')).toBe(true)
                // expect(res).toEqual(0)
            })
        },
        sanitizeResources: false,
        sanitizeOps: false      
    })

    Deno.test( {
        name: 'Latches: It should clear a lock on an object', 
        fn: () => {
            latches.setLatch('B', true).then( () => {
                latches.clearLatch('B')       
                expect(latches.getLatch('B')).toBe(false)
            })
        },
        sanitizeResources: false,
        sanitizeOps: false
    })
    
    Deno.test ( {
        name: 'Latches: It should wait for a lock', 
        fn: async () => {
            latches.setLatch('F', true).then( (res) => {
                expect(res).toEqual(0)    
                expect(latches.getLatch('F')).toBe(true)
                setTimeout( () => {latches.clearLatch('F') }, 50 )
                latches.setLatch('F').then((res) => {
                    expect(res).toBeGreaterThan(4)
                })  
            })
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

    Deno.test( {
        name: 'Latches: Trying to obtian an already set data lock should time out', 
        fn: () => {
            latches.setLatch('C', true).then( async () => {
                try {
                    await latches.setLatch('C')
                }
                catch(e) {
                    expect(e.stack).toMatch(/timed out while waiting for data latch/)  
                }
                finally {
                    latches.clearLatch('C')
                }
            }) 
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

    Deno.test({
        name: 'Latches: Trying to obtian an already set master lock should time out', 
        fn: () => {
            latches.setLatch('__MLatch__', true).then ( async () => {
                try {
                    await latches.setLatches(['data_5','data_6']) 
                }
                catch(e) {
                    expect(e.stack).toMatch(/timed out while waiting for master latch/)
                }
                finally {
                    latches.clearLatch('__MLatch__')
                }
            })
        },
        sanitizeResources: false,
        sanitizeOps: false 
    })
