import { Client } from "https://deno.land/x/postgres/mod.ts";
// import { pgManager, PgClient } from "./PgManager.ts"
// import { Client } from "https://deno.land/x/postgres/mod.ts";
// import { repeat } from "https://deno.land/std@0.81.0/bytes/mod.ts";
import { ctrl, Action, action } from "../../cxctrl/mod.ts"
import { CxError } from "../../cxutil/mod.ts"
import { _ } from "../../cxutil/mod.ts"
import { config } from "./config.ts"
import { ColumnDefType, TablesDefType, RepeatingGroupType } from "./interfaces.ts"

import { ghcnCodes, ghcnCodesInsert, loadList } from "./PgExtraTables.ts"

const __filename = new URL('', import.meta.url).pathname;

export let tables = new Map<string,TablesDefType>()

tables.set( 'Stations' ,{
    file: 'ghcnd-stations.txt',
    txt: 
       `ID            1-11   VARCHAR
        COUNTRY       1-2    VARCHAR
        NETC          3-3    VARCHAR
        STID          4-11   VARCHAR
        LATITUDE     13-20   REAL
        LONGITUDE    22-30   REAL
        ELEVATION    32-37   REAL
        STATE        39-40   VARCHAR
        NAME         42-71   VARCHAR
        GSN_FLAG     73-75   VARCHAR
        HCN_CRN_FLAG 77-79   VARCHAR
        WMO_ID       81-85   VARCHAR`,
    cols:    new Map<string,ColumnDefType>()
})


tables.set( 'Countries', {
    file: 'ghcnd-countries.txt',
    txt: 
       `ID           1-2    VARCHAR
        NAME         4-50    VARCHAR`,
    cols:    new Map<string,ColumnDefType>()
})

tables.set( 'States',  {
    file: 'ghcnd-states.txt',
    txt: 
       `ID           1-2    VARCHAR
        NAME         4-50    VARCHAR`,
    cols:    new Map<string,ColumnDefType>()
})

tables.set( 'Inventory', {
    file: 'ghcnd-inventory.txt',
    txt: 
       `ID            1-11   VARCHAR
        LATITUDE     13-20   REAL
        LONGITUDE    22-30   REAL
        ELEMENT      32-35   VARCHAR
        FIRSTYEAR    37-40   SMALLINT
        LASTYEAR     42-45   SMALLINT`,
    cols:    new Map<string,ColumnDefType>()
})

tables.set( 'Measurements', {
    file: 'all',
    txt:   
       `ID            1-11   VARCHAR
        COUNTRY       1-2    VARCHAR
        NETC          3-3    VARCHAR
        STID          4-11   VARCHAR
        YEAR         12-15   SMALLINT
        MONTH        16-17   SMALLINT
        ELEMENT      18-21   VARCHAR
        VALUE1       22-26   SMALLINT
        MFLAG1       27-27   VARCHAR
        QFLAG1       28-28   VARCHAR
        SFLAG1       29-29   VARCHAR`,
    cols:    new Map<string,ColumnDefType>()
})


@action({
    state: tables,
    init: true
})
export class PgTables extends Action<Map<string,TablesDefType>>{

    constructor( public keepLoadList: boolean = true, public parseOnly: boolean = false ) {
        super()
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

    async parseTmpl() {
        let self = this
        for ( let [key,def] of self.state ) {
            // console.log ( `Parsing  ${key}`)
            let columns = def.txt.match(/^.*([\n\r]+|$)/gm)
            if ( columns ) {
                let fnReadLine: string[] = []
                let repeatGroup: RepeatingGroupType[] = []
                let repeatGroupLength = 0
                let start = -1
                let end   = -1 
                columns.forEach( lin => {
                    let [ colName, len , colType ]  = lin.trim().split(/\s+/g)
                    let [_start, _end] = len.trim().split('-')
                    start = parseInt(_start) - 1
                    end   = parseInt(_end) 

                    // Make sure that JS numbers are no percieved as strings
                    // let prefix = colType === 'REAL' || colType === 'SMALLINT' ? '0 + ' : ''

                    if ( colName.trim().endsWith('1') ) { // repeatable group
                        colName = colName.trim().substr(0, colName.trim().length - 1)
                        repeatGroup.push ( { colName: colName, start: start, end: end, colType: colType } )
                        repeatGroupLength += ( end - start )
                    }
                    else {
                        if ( colType === 'REAL' || colType === 'SMALLINT' )
                            fnReadLine.push ( `"${colName}": line.substring(${start}, ${end}).trim()`)
                        else
                            fnReadLine.push ( `"${colName}": "'" + line.substring(${start}, ${end}).trim().replace(/'/g, "''" ) + "'"`)
                    }
                    let colLen = end - start
                    if ( colType === 'REAL' || colType === 'SMALLINT') {
                        colType = 'FLOAT8'
                        colLen = -1
                    }

                    let colDef = { type: colType, length: colLen}
                    self.state.get(key)!.cols.set(colName, colDef)

                    if ( colName === 'LONGITUDE' )  { // TODO: This is a hack for now
                        let colPosDef = { type: 'GEOGRAPHY', length: -1}
                        self.state.get(key)!.cols.set('GEO_POS', colPosDef)
                        fnReadLine.push ( `"GEO_POS": "'POINT(" + line.substring(${start}, ${end}).trim() + " " + line.substring( 12, 20).trim() + ")'"`)
                    }
                })
                //
                // Repeat for all days in a month
                // 
                if ( repeatGroupLength > 0 ) {
                    // Add the year and day fields
                    // let colDef = { type: 'integer', length: NaN, precision: NaN}
                    // self.state.get(key)!.cols.set('MYEAR', colDef)
                    let colDef1 = { type: 'integer', length: NaN, scale: NaN}
                    self.state.get(key)!.cols.set('DAY', colDef1)

                    for ( let i = 0; i < 31; i++ ) {
                        fnReadLine.push ( `"DAY_${i+1}": ${i+1}`)
                        let offset = i * repeatGroupLength
                        repeatGroup.forEach( col => {
                            if ( col.colType === 'REAL' || col.colType === 'SMALLINT' )
                                fnReadLine.push ( `"${col.colName}_${i+1}": line.substring(${col.start + offset}, ${col.end + offset}).trim()`)
                            else
                                fnReadLine.push ( `"${col.colName}_${i+1}": "'" + line.substring(${col.start + offset}, ${col.end + offset}).trim() + "'"`)
                        })
                    }
                }
                self.state.get(key)!.readTmpl = this.buildReadTmpl(key, fnReadLine)
                // let storePath =  `${config.staging.stageDir}/code/${key}_readline.ts`
                // Deno.writeTextFileSync(storePath, self.state.get(key)!.readTmpl!.toString())
            }
        }
    }

    async dropTables( client: Client) {
        let tableNames = [ ...tables.keys() ]
        tableNames.push('ghcn_codes')
        if ( ! this.keepLoadList ) {
            tableNames.push( 'load_list' ) 
        }
        try {
            tableNames.forEach(async tName => {
                console.log(`DROP ${tName}`)
                let sqlCmd = `DROP TABLE IF EXISTS ${tName}`

                    let result = await client.queryObject(sqlCmd)
                    // if ( result.error ) throw new Error(result.error)
            
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

    parseTables() {
        for ( let [table, def] of this.state ) {
            let cmd: string[] = []
            let ins: string[] = []
            // console.log(`CREATE UNLOGGED TABLE ${table}`)
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
            // console.log(sqlCmd)
            this.state.get(table)!.table  = sqlCmd
            this.state.get(table)!.insert = insCmd.replace('(,', '(')
            // console.log(this.state.get(table)!.insert)
        }
    }

    async createTables(client: Client) {
        try {
            if ( ! this.keepLoadList ) {
                console.log(`CREATE TABLE Loadlist`)
                // await this.client.queryArray(loadList)
                await await client.queryObject(loadList)
            }
            console.log(`CREATE TABLE GhcnCodes`)
        
            // let result = await this.client.queryArray(ghcnCodes)
            let result = await client.queryObject(ghcnCodes)
            if ( result.warnings.length === 0  ) {
                console.log(`INSERT GhcnCodes data`)
                result = await client.queryObject(ghcnCodesInsert)
            }
            else {
                console.log( `${JSON.stringify(result,undefined, 2)}`)
            }

            for ( let [table, def] of this.state ) {
                console.log(`CREATE TABLE ${table}`)
                result = await client.queryObject(def.table!)
            }
        }
        catch (err) {
            throw new CxError( __filename, 'createTables()', 'TABLE-0001',`createTables() failed.`, err)
        }
        finally {
            try {
                // this.client.end()
                console.log('Create tables...')
            }
            catch (err) {
                throw new CxError( __filename, 'createTables()', 'TABLE-0002',`this.client.end() failed.`, err)
            }
        }
    }

    async main() {
        console.log('Running PgTables')
        this.parseTmpl()
        this.parseTables()
        if ( ! this.parseOnly ) {
            let client = this.getClient()
            try {
                await client.connect()
                await this.dropTables(client)
                await this.createTables(client) 
            }
            catch (err) {
                throw new CxError( __filename, 'main()', 'TABLE-0005',`this.main() failed.`, err)
            }
            finally {
                client.end()
            }
        }
        this.publish()
    }
}
