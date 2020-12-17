import { ctrl, Action, action} from '../../cxctrl/mod.ts'
import { SqlParseType, ConstraintType, ColumnDefType } from './MysqlDumpParser.ts'

//
// Mapping of Mysql to typescript datatypes
//
export let typeMapper = new Map<string,string[]>() 
typeMapper.set( 'string' , [ 'VARCHAR', 'TINYTEXT', 'MEDIUMTEXT', 'LONGTEXT', 'TEXT', 'ENUM', 'SET', 'String' ] )
typeMapper.set( 'Date', [ 'DATE', 'TIMESTAMP', 'DATETIME' ])
typeMapper.set( 'number' , [ 'TINYINT', 'SMALLINT', 'INT', 'MEDIUMINT', 'YEAR', 'FLOAT', 'DOUBLE', 'NUMERIC', 'DECIMAL'] )
// For now the LB4 type is string for the entries below
typeMapper.set( 'stringBinary', [ 'TINYBLOB', 'MEDIUMBLOB', 'LONGBLOB', 'BLOB','BINARY', 'VARBINARY', 'BIT' ])

//
// Now make a reversed version of the mapping
//
export let mysqlMapper = new Map<string,string>() 
typeMapper.forEach(( values, key)  => {
    values.forEach( val => mysqlMapper.set(val,key) )
})

//
// Class related Type Definitions
//
export type MappingType = {
    properties:  Map<string, PropertyType[]>
    imports:     Map<string, ImportsType>
    propImports: Map<string, string[]>
    foreignKeys: Map<string, Map<string, ForeignKeysType>>
}

export type PropertyType = { 
    name:           string, 
    type:           string, 
    id?:            number, 
    required?:      boolean, 
    belongsTo?:     ConstraintType
    oneOrMany?:     ConstraintType
}

export type ForeignKeysType = {
    name:       string,
    entity:     string,
    entityKey:  string,
    foreignKey: string
}

export type ImportsType = {
    loopback: string[]
    models:   string[]
}

//
// Map to loopback properties
//
@action<MappingType>({
    ctrl: 'main',
    state: {
        properties:  new Map<string, PropertyType[]>(),
        imports:     new Map<string, ImportsType>(),
        propImports: new Map<string, string[]>(),
        foreignKeys: new Map()
    }
} )
export class TypeMap extends Action<MappingType> { 
    
    parsed: Readonly<SqlParseType> = {} as SqlParseType

    getProperties() {
        if ( ! this.parsed ) throw Error(`TypeMapping: the parsed object is undefined`)
        this.parsed.forEach( ( schemaEntry, schema ) => {
            let props: PropertyType[] = []
            if ( ! schemaEntry || ! schemaEntry.columns ) throw Error ( `getProperties: no schemaEntry or columns for ${schema}`)
            schemaEntry.columns.forEach( ( columnDef, columnName ) => {
                if ( ! this.state.imports.get(schema) ) {
                    this.state.imports.set(schema, { loopback: [], models: [] })
                    this.state.propImports.set(schema, [] )
                }
                //
                // Property name and type
                //
                let property: PropertyType = { name: columnName, type: mysqlMapper.get(columnDef.colType.toUpperCase())! }
                if ( property.type === 'Date' )
                    this.state.propImports.get(schema)!.push('import { parse } from "https://deno.land/std/datetime/mod.ts"')

                //
                // Primary Key
                //
                if ( columnDef.colPK! > 0 ) property.id = columnDef.colPK
                //
                // Property required?
                //
                property.required = columnDef.colNull === 'NULL' ?  false : true
                // console.log(` ${schema}.${property.name} property.required : ${ property.required}`)
                //
                // References from other tables
                //
                if ( this.parsed.has(schema) &&  this.parsed.get(schema)!.references ) {
                    this.parsed.get(schema)!.references!.filter( 
                        item  =>  ( item.fkTable === schema && item.fkColumn === columnName ) ).forEach( ref => {
                            this.state.imports.get(schema)!.loopback.push(ref.oneOrMany)
                            property.oneOrMany = ref
                            this.state.imports.get(schema)!.models.push(ref.table) 
                        })
                } 
                //
                // Property Foreign Keys
                //
                if ( columnDef.colFK ) {
                    this.state.imports.get(schema)!.loopback.push('belongsTo')                
                    property.belongsTo = columnDef.colFK
                    this.state.imports.get(schema)!.models.push(columnDef.colFK.fkTable)
                    // Initialize
                    if ( ! this.state.foreignKeys.get(schema) ) {
                        this.state.foreignKeys.set( schema, new Map<string, ForeignKeysType>() )
                    }
                    this.state.foreignKeys.get(schema)!.set( columnDef.colFK.constraint, { 
                        name: columnDef.colFK.constraint,  
                        entity: columnDef.colFK.fkTable,
                        entityKey: columnDef.colFK.fkColumn,
                        foreignKey: columnDef.colFK.column 
                    })
                }
                props.push(property)
            })
            this.state.properties.set(schema, props)
        })
    }

    main() {
        this.parsed = ctrl.getState('MysqlDumpParser')
        this.getProperties()
        this.publish()
    }
}