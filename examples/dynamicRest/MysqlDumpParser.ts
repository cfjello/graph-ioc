import { ctrl, Action, action } from '../../cxctrl/mod.ts'

import { DumpFile } from './mod.ts'
//
// Class related Type Definitions
//
export type ConstraintType = { 
    table: string
    column: string
    constraint: string 
    fkTable: string 
    fkColumn: string 
    required: boolean 
    oneOrMany: string
}

export type ColumnDefType = {
    colName: string
    colType: string
    colSize: number
    colNull: string
    colPK?: number
    colUK?: boolean
    colFK?: ConstraintType
}

export type SchemaEntryType = { 
    columns?: Map<string,ColumnDefType> 
    references?: ConstraintType[]
    inserts?: {
        colList: string[]
        values:  string[]
    }
}

export type SqlParseType = Map<string, SchemaEntryType>

//
// Parse a Mysql Dump file
// 
@action<SqlParseType>({
    ctrl: 'parse',
    state: new Map<string, SchemaEntryType>()
} )
export class MysqlDumpParser  extends Action<SqlParseType> { 

    is_create_statement  = (line: string ) => line.startsWith('CREATE TABLE')
    is_field_definition  = (line: string ): boolean =>  line.trim().startsWith('`')
    is_insert_statement  = (line: string ): boolean =>  line.trim().startsWith('insert into')
    is_insert_row        = (line: string ): boolean =>  ( line.trim().startsWith('(') && line.trim().endsWith('),') )
    is_insert_row_last   = (line: string ): boolean =>  ( line.trim().startsWith('(') && line.trim().endsWith(');') )
    is_primary_key       = (line: string ): boolean =>  line.trim().startsWith('PRIMARY KEY')
    is_unique_key        = (line: string ): boolean =>  line.trim().startsWith('KEY')
    is_foreign_key       = (line: string ): boolean =>  line.trim().includes('FOREIGN KEY')

    is_required = (colDef: ColumnDefType)  => ( colDef.colNull === 'NOT NULL' )
 
    getMysqlNameValues = (line: string ): string[]  => {
        // let name:  RegExpMatchArray
        let result: string [] = []
        let names: string[] | null = line.match(/`[^`]+`/g)
        names !== null && names.forEach( item => result.push(item.replace(/`/g, '') ) )
        return result 
    }

    getMysqlFieldDef = (line: string ): RegExpMatchArray => {
        let res = line.match(/\`\s+([a-zA-Z0-9]+)\(([0-9\.\,]+)\)\s+([^\s]+\s+[^\s]+)\s*,\s*$/ )
        // Handle fields with no size definition
        if ( !res ) res = line.match(/\`\s+([a-zA-Z0-9]+)\s+([^\s]+\s+[^\s]+)\s*,\s*$/ )
        // Handle fields with no size and no NULL definition
        if ( !res ) res = line.match(/\`\s+([a-zA-Z0-9]+)\s*,\s*$/ )
        if ( res === null )  
            throw new Error(`getMysqlFieldDef(): no field definition for ${line}`)
        else
            return res
    }

    parse(): void {
        let dumpFile: Readonly<DumpFile> = ctrl.getState('MysqlDumpReader')
        let references = new Map<string, ConstraintType[]>()
        let currTableName  = ''
        let currInsertName = ''
        if ( dumpFile.data && dumpFile.data.length > 0  ) {
            dumpFile.data.split(/\r?\n/).forEach( (line: string, idx: number ) => {
                if ( this.is_create_statement(line) ) {
                    currTableName = this.getMysqlNameValues(line)[0]
                    currInsertName = ''
                    //
                    // Initialize
                    //
                    this.state.set(currTableName, { 
                        columns: new Map<string,ColumnDefType>(),
                        inserts: { colList: [], values: [] } 
                    })
                }
                else if ( currTableName && this.is_field_definition(line) ) {
                    let fieldName = this.getMysqlNameValues(line)[0]
                    let fieldDef  = this.getMysqlFieldDef(line)
                    // console.log(`${currTableName}.${fieldName}: ${fieldDef}`)
                    let colNull   =  fieldDef.includes('NOT NULL') ? 'NOT NULL' : 'NULL'
                    let column: ColumnDefType  = { 
                        colName: fieldName, 
                        colType: fieldDef[1], 
                        colSize: parseInt( fieldDef[2] ), 
                        colNull: colNull,
                        colPK: -1
                    }
                    this.state.get(currTableName)!.columns!.set(fieldName, column)
                }
                else if ( currTableName && this.is_primary_key(line) ) {
                    let idx = 1
                    this.getMysqlNameValues(line).forEach( fieldName => {
                        if (idx === 1 ) this.state.get(currTableName)!.columns!.get(fieldName)!.colUK   = true
                        this.state.get(currTableName)!.columns!.get(fieldName)!.colPK   = idx++

                    })
                }
                else if ( currTableName && ( this.is_unique_key(line) ) ) {
                        this.state.get(currTableName)!.columns!.get(this.getMysqlNameValues(line)[1])!.colUK   = true
                }
                else if ( currTableName && this.is_foreign_key(line) ) {
                    let [ constraint, columnName, fkTable, fkColumn ] = this.getMysqlNameValues(line)
                    let colFK: ConstraintType = { 
                        table: currTableName, 
                        column: columnName,
                        constraint: constraint, 
                        fkTable:  fkTable, 
                        fkColumn: fkColumn, 
                        required: this.is_required( this.state.get(currTableName)!.columns!.get(columnName)! ),
                        oneOrMany: this.state.get(currTableName)!.columns!.get(columnName)!.colUK ? 'hasOne' : 'hasMany'
                    }  
                    // Store for later use
                    if ( ! references.has( fkTable ) ) references.set(  fkTable, [])
                    references.get( fkTable )!.push(colFK) 
                    // Set the column constraint
                    this.state.get(currTableName)!.columns!.get(columnName)!.colFK = colFK
                }
                else if ( this.is_insert_statement(line) ) {
                    let columns = this.getMysqlNameValues(line)
                    currInsertName = columns[0]
                    currTableName = ''
                    this.state.get(currTableName)!.inserts!.colList = columns.slice(1)
                }
                else if ( this.is_insert_row(line) || this.is_insert_row_last(line) ) {
                    this.state.get(currTableName)!.inserts!.values.push( line.trim().replace(/^\(\s*/, '' ).replace(/\),\s*$/,'') )
                }
            })
        }
        references.forEach( ( constraints, table ) =>  this.state.get(table)!.references = constraints )
        this.publish()
    }   
}