import { ctrl } from '../../cxctrl/mod.ts'
import { MysqlDumpReader, MysqlDumpParser, TypeMap, CodeRender, CodeWriter   } from './mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'
//
// Instanciate
//
let dumpReader: MysqlDumpReader  = await new MysqlDumpReader().register() 

let dumpParser = await new MysqlDumpParser().register()
dumpParser.setDependencies('MysqlDumpReader')

let typeMap = await new TypeMap().register()
typeMap.setDependencies('MysqlDumpParser')

let codeRender = await new CodeRender().register()
codeRender.setDependencies('TypeMap')

let codeWriter = await new CodeWriter().register()
codeWriter.setDependencies('CodeRender')

let promiseChain = ctrl.getPromiseChain('CodeWriter')
//
// Run
//
await promiseChain.run()

Deno.test ({
    name: 'dumpReader should be registered and should have run', 
    fn: () => {
        expect(ctrl.store.isRegistered('MysqlDumpReader')).toBeTruthy()
        expect(dumpReader.meta.callCount).toBeGreaterThan(0)  
        expect(dumpReader.state.data).toBeDefined()  
        expect(dumpReader.state.data!.length).toBeGreaterThan(10000)   
    },
    sanitizeResources: false,
    sanitizeOps: false       
})

Deno.test ({
    name: 'dumpParser should be registered and should have run', 
    fn: () => {
        expect(ctrl.store.isRegistered('MysqlDumpParser')).toBeTruthy()
        expect(dumpReader.state.data!.length).toBeGreaterThan(10000)  
        expect(dumpParser.meta.callCount).toBeGreaterThan(0) 
        expect(dumpParser.state).toBeDefined()   
        expect(dumpParser.state.size).toBeGreaterThan(0)

    },
    sanitizeResources: false,
    sanitizeOps: false       
})

Deno.test ({
    name: 'TypeMap should be registered and should have run', 
    fn: () => {
        expect(ctrl.store.isRegistered('TypeMap')).toBeTruthy()
        expect(typeMap.meta.callCount).toBeGreaterThan(0)    
        expect(typeMap.state).toBeDefined()  
        expect(typeMap.state.properties.size).toBeGreaterThan(0)
    },
    sanitizeResources: false,
    sanitizeOps: false       
})

Deno.test ({
    name: 'CodeRender should be registered and should have run', 
    fn: () => {
        expect(ctrl.store.isRegistered('CodeRender')).toBeTruthy()
        expect(codeRender.meta.callCount).toBeGreaterThan(0) 
        expect(codeRender.state).toBeDefined()     
        expect(codeRender.state.models.size).toBeGreaterThan(0)
    },
    sanitizeResources: false,
    sanitizeOps: false       
})

Deno.test ({
    name: 'CodeWriter should be registered and should have run', 
    fn: () => {
        expect(ctrl.store.isRegistered('CodeWriter')).toBeTruthy()
        expect(codeWriter.meta.callCount).toBeGreaterThan(0)   
        expect(codeWriter.state).toBeDefined()     
        expect(codeWriter.state.fileNames.length).toBeGreaterThan(0) 
    },
    sanitizeResources: false,
    sanitizeOps: false       
})




