import {ctrl, Action, action } from '../../cxctrl/mod.ts'
import { startServer } from './server.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'


type A = {name:string, age: number} 
type B = {name:string, age: number}
type C = {name:string, age: number}
type D = {name:string, age: number}
type F = {name?:string, age?: number, sex?: string}


@action<A>({ ctrl: 'main', state:{name: 'A', age:3 }})
class ObjA  extends Action<A> {  
  ctrl(): boolean { 
    this.publish();
    return true 
  } 
}  
let instA = await new ObjA().register()

@action<B>({ state:{name: 'B', age:6 }})
class ObjB  extends ObjA {}  
let instB = await new ObjB().register()

@action<C>({ state:{name: 'C', age: 9 }})
class ObjC  extends ObjA {}  
let instC = await new ObjC().register()

startServer().then( () => {
    Deno.test({
        name: 'REST server can answer request', 
        fn: async () => {
              const response = await fetch("http:127.0.0.1:9999/ObjA")
              expect(response).toBeDefined()
              expect(response.status).toEqual(200)
              expect(response.statusText).toEqual('OK')
              response.json().then( (jsonData) => {
                // console.log(jsonData)
                expect(jsonData.success).toBeTruthy()
                expect(jsonData.data.name).toEqual('A')
                expect(jsonData.data.age).toEqual(3)
                
              })      
            },
        sanitizeResources: false,
        sanitizeOps: false  
    })

    Deno.test({
      name: 'REST server does not answer BAD request', 
      fn: async () => {
            const json = await fetch("http:127.0.0.1:9999/ObjX")
            expect(json.statusText).toMatch(/Not Found/)
            // console.log(json)   
          },
      sanitizeResources: false,
      sanitizeOps: false  
  })

  Deno.test({
    name: 'REST server can answer request By Id', 
    fn: async () => {
          const storeId = instA.currActionDesc.storeId 
          const response = await fetch(`http:127.0.0.1:9999/ObjA/${storeId}`)
          expect(response).toBeDefined()
          expect(response.status).toEqual(200)
          expect(response.statusText).toEqual('OK')
          response.json().then( (jsonData) => {
            // console.log(jsonData)
            expect(jsonData.success).toBeTruthy()
            expect(jsonData.data.name).toEqual('A')
            expect(jsonData.data.age).toEqual(3)
          })      
        },
    sanitizeResources: false,
    sanitizeOps: false  
})
/*
Deno.test({
    name: 'REST server can publish an update', 
    fn: async () => {
          // const response = await fetch("http:127.0.0.1:6666/api/v1/ObjA")


          expect(response).toBeDefined()
          expect(response.status).toEqual(200)
          expect(response.statusText).toEqual('OK')
          response.json().then( (jsonData) => {
            // console.log(jsonData)
            expect(jsonData.success).toBeTruthy()
            expect(jsonData.data.name).toEqual('A')
            expect(jsonData.data.age).toEqual(3)
          })      
        },
    sanitizeResources: false,
    sanitizeOps: false  
})

*/

})
