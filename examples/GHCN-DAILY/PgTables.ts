import { Client } from "https://deno.land/x/postgres/mod.ts";
import { Action, action } from "../../cxctrl/mod.ts"
import { CxError } from "../../cxutil/mod.ts"
import { _ } from "../../cxutil/mod.ts"
import { config } from "./config.ts"
import { ColumnDefType, TablesDefType, RepeatingGroupType, TableStatus, TablesType } from "./interfaces.ts"
import { textTables, dataTables, textInserts } from "./PgTableDefs.ts"
import { tableMods } from "./PgTableMods.ts"

const __filename = new URL('', import.meta.url).pathname;

@action({
    state: {
        tableStatus: new Map<string, Partial<TableStatus>>(),
        tableDefs:   new Map<string,TablesDefType>(),
        // dataTables:  Map<string, string>
        } as TablesType
})
export class PgTables extends Action<TablesType> {

    constructor( public keepLoadList: boolean = true, public parseOnly: boolean = false ) {
        super( )
    }
    
    //
    // Alternative login for the daily files, since pgManager creates problems, probably associated to rollbacks
    // 
    getClient(): Client {
        return  new Client({
            user: config.dbConf.user,
            password: config.dbConf.password,
            database: config.dbConf.database,
            hostname: config.dbConf.hostname,
            port:  config.dbConf.port,
        })
    }

    buildReadTmpl( key: string, fnReadLine: string[] ): string[] {
        let func  = `return new Object({ 
    `
        let returnVal = fnReadLine.join(',\n        ').trim()
        func += returnVal.substring( 0, returnVal.length ) + `
    })`
        return [ 'line' , func ]
    }

    quote( colType: string ): string | number {
        if ( colType === 'REAL' || colType === 'SMALLINT' ) 
            return ""
        else
            return "'"
    }

    parseTmpl() {
        let self = this
        for ( let [key,def] of textTables ) {
            self.state.tableDefs.set ( key , {} as TablesDefType )
            self.state.tableDefs.get( key )!.cols = new Map<string,ColumnDefType>() 
            let columns = def.txt.match(/^.*([\n\r]+|$)/gm) 
            if ( columns ) {
                let fnReadLine: string[] = []
                let repeatGroup: RepeatingGroupType[] = []
                let repeatGroupLength = 0
                let start = -1
                let end   = -1 
                columns.forEach( ( lin: string )   => {
                    let [ colName, len , colType ]  = lin.trim().split(/\s+/g)
                    let [_start, _end] = len.trim().split('-')
                    start = parseInt(_start) - 1
                    end   = parseInt(_end) 

                    if ( colType === 'REAL' || colType === 'SMALLINT' )
                        fnReadLine.push ( `"${colName}": line.substring(${start}, ${end}).trim()`)
                    else
                        fnReadLine.push ( `"${colName}": "'" + line.substring(${start}, ${end}).trim().replace(/'/g, "''" ) + "'"`)

                    let colLen = end - start
                    if ( colType === 'REAL' || colType === 'SMALLINT') {
                        colType = 'FLOAT8'
                        colLen = -1
                    }

                    let colDef = { type: colType, length: colLen}
          
                    self.state.tableDefs.get(key)!.cols.set(colName, colDef)

                    if ( colName === 'LONGITUDE' )  { // TODO: This is a hack for now
                        let colPosDef = { type: 'GEOGRAPHY', length: -1}
                        self.state.tableDefs.get(key)!.cols.set('GEO_POS', colPosDef)
                        fnReadLine.push ( `"GEO_POS": "'POINT(" + line.substring(${start}, ${end}).trim() + " " + line.substring( 12, 20).trim() + ")'"`)
                    }
                })
                self.state.tableDefs.get(key)!.readTmpl = this.buildReadTmpl(key, fnReadLine)
            }
        }
    }

    setTableStatus( tableName:string, status: Partial<TableStatus> ) {
        if ( this.state.tableStatus.has( tableName ) ) {
            this.state.tableStatus.set( tableName, _.merge( this.state.tableStatus.set( tableName, status ) ) )
        }
        else {
            this.state.tableStatus.set( tableName, status ) 
        }
    }

    async dropTables( client: Client) {
        let self = this
        let tableNames1 = [ ... textTables.keys() ]
        let tableNames2 = [ ... dataTables.keys() ].filter( elem  => ( elem !== 'LOAD_LIST' && self.keepLoadList)  || !self.keepLoadList )
        console.log(`DROP TABLES...`)
        let tableNames = tableNames1.concat( tableNames2.reverse() )
        try {
            tableNames.forEach(async tName => {
                console.log(`DROP ${tName}`)
                let sqlCmd = `DROP TABLE IF EXISTS ${tName} CASCADE`
                let result = await client.queryObject(sqlCmd)
                this.setTableStatus( tName, {dropped: true } )
            })
            if ( this.keepLoadList ) {
                let sqlCmd = 'UPDATE load_list set started = NULL, ended = NULL, success = false WHERE started IS NOT NULL OR ended IS NOT NULL'
                await client.queryObject(sqlCmd)
            }
        }
        catch (err) {
            throw new CxError( __filename, 'dropTables()', 'TABLE-0003',`dropTables() failed.`, err)
        }
    }

    async createIndexes(client: Client) {
        try {  
            for ( let [name, def] of tableMods ) {
                if ( def.sql == 'Index' ) {
                    console.log(`CREATE Index ${name}`)
                    await client.queryObject(def.stmt)
                    this.setTableStatus( name, {created: true } )
                }
            }
        }
        catch (err) {
            throw new CxError( __filename, 'createIndexes()', 'TABLE-0006',`createIndexes() failed.`, err)
        }
    }

    async createTables(client: Client) {
        try {  
            for ( let [table, def] of this.state.tableDefs ) {
                // console.log(`CREATE TABLE ${table}: ${def.table}`)
                console.log(`CREATE TABLE TABLE IF NOT EXISTS ${table}`)
                await client.queryObject(def.table!)
                this.setTableStatus( table, {created: true } )
            }

            for ( let [table, def] of dataTables ) {
                if ( this.keepLoadList && table === 'LOAD_LIST') continue
                console.log(`CREATE TABLE TABLE IF NOT EXISTS ${table}`)
                await client.queryObject(def)
                this.setTableStatus( table, {created: true } )
            }

            for ( let [table, ins] of textInserts ) {
                console.log(`INSERT: ${table}`)
                let res = await client.queryObject(ins as string)
                this.setTableStatus( table, { inserts: res.rowCount} )
            }
        }
        catch (err) {
            throw new CxError( __filename, 'createTables()', 'TABLE-0001',`createTables() failed.`, err)
        }
    }
    
    parseTables() {
        for ( let [table, def] of this.state.tableDefs ) {
            let cmd: string[] = []
            let ins: string[] = []
            cmd.push(`CREATE TABLE IF NOT EXISTS ${table} (`)
            ins.push(`INSERT INTO ${table} (` )
            for ( let [col, colDef] of def.cols ) {
                let len = colDef.length > 0 ? `(${colDef.length})`: ''
                cmd.push(`${col} ${colDef.type}${len},`)
                ins.push( col )
            }
            if ( table === 'Measurements' ) {
                cmd.push(`FILE_ID INTEGER NOT NULL `)
                ins.push('FILE_ID')
            }
            let sqlTmp = cmd.join('\n')
            let insTmp = ins.join(',')
            let sqlCmd = sqlTmp.substring(0, sqlTmp.length - 1) + ')'
            let insCmd = insTmp.substring(0, sqlTmp.length - 1) + ')  VALUES '
            this.state.tableDefs.get(table)!.table  = sqlCmd
            this.state.tableDefs.get(table)!.insert = insCmd.replace('(,', '(')
            //
            // add information on whether the table is initilized or not
            //
            this.state.tableDefs.get(table)!.initialized = this.keepLoadList
        }
    }

    async cleanup( client: Client) {
        try {
            let result = await client.queryObject('DELETE FROM STATIONS WHERE FILE_ID IN ( SELECT id FROM load_list WHERE started IS NOT NULL AND ended IS NULL )' )
            console.log( `DELETED IN TABLE STATIONS INCOMPLETE LOADED DATA SETS, num of. rows: ${result.rowCount}`)
            await client.queryObject(`UPDATE load_list SET started = NULL WHERE started IS NOT NULL AND ended IS NULL`)
        }
        catch(err) {
            throw new CxError( __filename, 'PgLoadData.cleanup()', 'TABLE-0006',`Failed to cleanup the tables.`, err)
        }
    }

    async main() {
        console.log('Running PgTables')

        let client = this.getClient()
        try {
            await client.connect()
            console.log('Connected...')
            this.parseTmpl()
            this.parseTables()
            if ( ! this.parseOnly ) {
                await this.dropTables(client)
                await this.createTables(client) 
                await this.createIndexes(client)
            }
            await this.cleanup(client)
        }
        catch (err) {
            throw new CxError( __filename, 'main()', 'TABLE-0005',`this.main() failed.`, err)
        }
        finally {
            client.end()
        }

        this.publish()
    }
}
