import {ctrl, Action, action} from '../../cxctrl/mod.ts'
import uniq  from 'https://raw.githubusercontent.com/lodash/lodash/master/uniq.js'
import isEmpty from 'https://raw.githubusercontent.com/lodash/lodash/master/isEmpty.js'
import cloneDeep    from "https://raw.githubusercontent.com/lodash/lodash/master/cloneDeep.js"
import { CxGraph, Node } from "https://deno.land/x/cxgraph/mod.ts"
import { MappingType, PropertyType, ForeignKeysType } from './MysqlTypeMapper.ts'
import { ConstraintType } from "./MysqlDumpParser.ts"

//
// Overall structure graph
// 
export let graph: CxGraph  = new CxGraph()
let appModule:  Map<string, string[]> = new Map<string, string[]>()
let appImports: Map<string, string[]> = new Map<string, string[]>()
// let dependencies: Map<string, string[]> = new Map<string, string[]>()

//
// Render the code
//
export type RenderingType = { models: Map<string,string[]> }

@action<RenderingType>({
    state: {
        models: new Map<string,string[]>(),
    }
} )
export class CodeRender extends Action<RenderingType> {
    typeMap: Readonly<MappingType> = {} as MappingType
    
    initCap( str:string ) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    initLow( str:string ) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }

    getClassName( modelName: string ) {
        return this.initCap( modelName.trim() ) 
    }

    modelImport( modelName : string ) {
        let className = this.getClassName( modelName) 
        return `import { ${className}Type } from './${className}.model.ts'`
    }

    appImports( modelName : string ) {
        let className = this.getClassName( modelName) 
        return `import { ${className}Type, ${className} } from './${className}.model.ts'`
    }

    propImports( schema: string ) {
        return this.typeMap.propImports && this.typeMap.propImports.has(schema) ? uniq(this.typeMap.propImports.get(schema)!) : []
    }

    renderReference(c: ConstraintType, reverseRef: boolean = false): string {
        let multi = '' 
        // if ( c.oneOrMany === 'hasMany' ) multi =  '[]' 
        // else if ( c.oneOrMany === 'hasOne' ) multi =  ''

        let Table = this.initCap(c.table)
        let FkTable = this.initCap(c.fkTable)
        let currTable = ''
        let tmpl = ''
        if ( c.table !== c.fkTable ) {
            /*
            if ( ! graph.hasNode( Table ) ) graph.addNode( new Node( Table ) )
            if ( ! graph.hasNode( FkTable ) ) graph.addNode( new Node( FkTable ) )
            try {
                if ( ! reverseRef && FkTable !== Table && ! graph.getOutgoingEdges(FkTable).includes(Table) )  {
                    console.log(`${FkTable} depends on ${Table}`)
                    graph.addDependency(  FkTable, Table )  
                }
            }
            catch (e) {
                console.log(e)
            }
            */
            if ( reverseRef ) {
                currTable = c.table
                multi = '[]'
                tmpl = `    get${Table}Ref() : Readonly<${FkTable}Type${multi}> { return ctrl.getState(\'${Table}\') }`
                // console.log(FkTable + " --> " + Table + `<hasMany>:` + tmpl)
            }
            else {
                currTable = c.fkTable
                tmpl = `    get${FkTable.replace(/s$/,'')}Ref() : Readonly<${FkTable}Type${multi}> { return ctrl.getState(\'${FkTable}\') }`
                // console.log(Table + " --> " + FkTable + `<${c.oneOrMany}>:` + tmpl)
            }   
        }
        // console.log(Table + " --> " + FkTable + `<${c.oneOrMany}>:` + tmpl)
            return tmpl
    }

    property( p: PropertyType ): string {
        let pk: string =  p.id! > 0  ? `, id:  ${p.id}` : ''
        let required = p.required ? '' : '?'
        let tmpl = `\t${p.name}${required}: ${p.type.replace('stringBinary','any')};`
        return tmpl
    }

    createModels( app: string = 'app.ts' ) {
        // this.state.models.get(name)!
        let self = this
        //
        // First pass to lookup foreign keys
        // 
        // type refsType = ConstraintType & { rendering: string }
        let refs = new Map<string, string[]>()
        
        this.typeMap.properties.forEach( ( props: PropertyType[], schema: string) => {
            props.forEach( p => {
                if ( p.oneOrMany ) {
                    //
                    // The main reference
                    //
                    if ( ! refs.has( p.oneOrMany.table ) ) refs.set( p.oneOrMany.table, [] )
                    let tmpl = this.renderReference(p.oneOrMany)
                    refs.get(p.oneOrMany.table)!.push( tmpl ) 
                    //
                    // The reverse reference
                    //
                    if ( ! refs.has( p.oneOrMany.fkTable ) ) refs.set( p.oneOrMany.fkTable, [] )
                    let tmpl2 = this.renderReference(p.oneOrMany, true)
                    refs.get(p.oneOrMany.fkTable)!.push( tmpl2 ) 
                }
            })
        })
        //
        // Second pass, Main loop over the properties
        //
        this.typeMap.properties.forEach( ( props: PropertyType[], schema: string) => {
            let name = this.initCap(`${schema}.model.ts`) 
            let Schema = this.getClassName(schema)
            if ( ! graph.hasNode(Schema) )  graph.addNode(Schema)
            if ( ! appImports.has(Schema) ) appImports.set(Schema, [] )
            appImports.get(Schema)!.push( this.appImports(schema) )
            if ( ! appModule.has(Schema) ) appModule.set(Schema, [] )
            appModule.get(Schema)!.push( `export let ${schema}Inst = await new ${Schema}().register()` )
            let m: any =  [] 

//
// Render the imports 
//
            m.push(`
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import {ctrl, Action, action} from "../../../cxctrl/mod.ts"
import { ee } from "../../../cxutil/mod.ts"
            `)
            //
            // Model Imports
            //
            uniq(self.typeMap.imports.get(schema)!.models.filter(item => item !== schema)).forEach( ( modelName: string) => {
                m.push( self.modelImport( modelName ) )
            })
            //
            // imports for conversion of properties
            // 
            uniq( this.propImports(schema) ).forEach( ( url: string ) => {
                m.push(`${url}
            `)
            })        
//
// Render Type definition
// 
            m.push( `export type ${Schema}Type = {`) 
            props.forEach( p => { m.push( self.property(p) ) })
            m.push(`} // End of ${schema}Type
            `)
//
// Render the Class action properties
//
            m.push( `
@action({
    name: '${Schema}',
    state: [] as ${Schema}Type[],
    init: false
  })`)
            m.push( `export class ${Schema} extends Action<${Schema}Type[]> {
    self = this
    filePath = path.resolve(ctrl.__dirname  + "/examples/dynamicRest/resources/" + "${schema}.data");`)
            // 
            // Render the class foreignKeys dependencies
            // 
            let foriegnKeys: string[] = refs.has(schema) ? uniq( refs.get(schema)! ): []
            foriegnKeys.forEach( (val , idx) => {
                 m.push(val)
            })
//
// Function that will populate the Class instance with data
//       
            m.push(`
    populate( _filePath: string = this.filePath ) { 
        let dataArr = Deno.readTextFileSync(_filePath).split('\\n')
        let jsonData: ${Schema}Type[] = [] as ${Schema}Type[]
        dataArr.forEach(  (_row, idx ) => {
            let row = _row.split(',')
            let obj: ${Schema}Type = {} as ${Schema}Type
            try {`)

            let i = 0        
            props.forEach( p => {
                let prefix = p.required ? '' : `row[${i}] === 'NULL' ? undefined :`
                let assignment = `              obj.${p.name} =  `
                if (p.type  === 'Date' ) {
                    assignment +=  ` ${prefix} parse( row[${i}].replace(/^['"](.+)['"]$/,'$1') , "yyyy-MM-dd")`
                }
                if ( p.type === 'string' ) {
                    assignment += ` ${prefix} row[${i}].replace(/^['"](.+)['"]$/,'$1')`
                }
                else if ( p.type === 'number') {
                    assignment += ` ${prefix} +row[${i}]`
                }
                else if (p.type === 'stringBinary') {
                    assignment += ` ${prefix} row[${i}]`
                }
                m.push( assignment ) 
                i++
            })
            m.push(`              this.state.push(obj) 
            }
            catch(e)  { console.log(e) }
        }) // End of dataArr.forEach
    } // End of populate` )

            m.push(`
    main() {
        this.populate()
        this.publish()
    } // End of main
} // End of ${Schema}
`)
            self.state.models.set(name, m )
        })    
    }

    createApp() {
        let name = this.initCap(`app.test.ts`) 
        let g = graph.overallHierarchy(true, 2 )
        let a: string[] = []
        //
        // The main App
        // 
        a.push(`import {ctrl, Action, action} from "../../../cxctrl/mod.ts"
import { expect }  from "https://deno.land/x/expect/mod.ts"
import { startServer } from "../../cxrest/server.ts"
        `)
        //
        // Add the imports
        // 
        g.forEach( (val: any, key:string ) => {
            let imports = appImports.get(key)! 
            a = a.concat(imports)
        })
        a.push(``)
        //
        // Add the object instantiations
        // 
        g.forEach( (val: any, key:string ) => {
            let inst  = appModule.get(key)! 
            a = a.concat(inst)
        })
        
       //
        // Add a simple Top Node
        //

        a.push(`
ctrl.graph.addTopNode('T')
let promiseChainT = ctrl.getPromiseChain('T')
promiseChainT.run()
let actionStates = [`)
        //
        // Add List of state object
        // 
        g.forEach( (val: any, key:string ) => {
            a.push(`    "${key}",`)
        })
        a.push(`]

Deno.test ({  
    name: 'The Application classes should be registered and have data loaded', 
    fn: () => {
        actionStates.forEach(element => {
            console.log('Checking: ' + element)
            expect(ctrl.store.isRegistered(element)).toBeTruthy()
            let state: any[] = ctrl.store.get(element) as any[]
            console.log(element + '.state has ' + state.length + ' rows')
            expect(state.length).toBeGreaterThan(6)
        });
    },
    sanitizeResources: false,
    sanitizeOps: false       
})

startServer()
`)
        this.state.models.set(name, a )
    }

    main() {
        this.typeMap = ctrl.getState('TypeMap')
        this.createModels()
        this.createApp()
        this.publish()
    }
}