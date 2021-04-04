import { Client } from "https://deno.land/x/postgres/mod.ts";
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import { delay } from 'https://deno.land/x/delay/delay.js'
import { ctrl, Action, action } from "../../cxctrl/mod.ts"
import { CxContinuous } from "../../cxstore/mod.ts"
import { CxError } from "../../cxutil/mod.ts"
import { _ } from "../../cxutil/mod.ts"
import { LoadListType, ConfigType, ColumnDefType, TablesDefType, RepeatingGroupType } from "./interfaces.ts"
// import { ConnectionPool, PoolClient } from "./PgConnPool.ts"
// import { LoadList } from "./LoadList.ts"
// import { PgTables, tables } from "./PgTables.ts"
import { config } from "./config.ts"
// import { existsSync } from "https://deno.land/std/fs/mod.ts"

// import { pgManager, PgClient } from "./PgManager.ts";


export const __dirname = path.dirname( path.fromFileUrl(new URL('.', import.meta.url)) )

const __filename = new URL('', import.meta.url).pathname;

@action({
    state: [] as LoadListType[]
})
export class PgLoadData extends Action<LoadListType> {
    // private conn =   ConnectionPool.getInstance() 
    static itor: CxContinuous<LoadListType[],LoadListType>
    

    initCap = function( str: string ): string {
        return str.charAt(0).toUpperCase() + str.slice(1)
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

    async readFile( filePath: string): Promise<Array<string>> {
        try {
            const decoder = new TextDecoder("utf-8")
            const text: string = decoder.decode(await Deno.readFile(filePath))
            return Promise.resolve( text.split("\n") )
        }
        catch(err) {
            throw new CxError( __filename, 'PgLoadData.main()', 'LOAD-0003',`Failed to read text file: ${filePath}.`, err)
        }
    }

    async cleanup() {
        let client: Client = this.getClient()
        await client.connect()
        try {
            let result = await client.queryObject(`DELETE FROM Measurements WHERE FILE_ID IN ( SELECT id FROM load_list WHERE started IS NOT NULL AND ended IS NULL )`)
            console.log( `DELETED Measurements INCOMPLETE LOADED ROWS, num of. rows: ${result.rowCount}`)
            await client.queryObject(`UPDATE load_list SET started = NULL WHERE started IS NOT NULL AND ended IS NULL`)

        }
        catch(err) {
            throw new CxError( __filename, 'PgLoadData.cleanup()', 'LOAD-0005',`Failed to cleanup the tables.`, err)
        }
        finally {
            client.end()
        }
    }

    async loadTxtFile( fileEntry: LoadListType, client: Client) {
        let baseName  = path.basename(fileEntry.filepath)
        let tableName = this.initCap( baseName.replace(/^ghcnd-/, '').replace(/\.txt$/, '' ) ) 
        let filePath =  path.normalize(`${config.staging.stageDir}/files/${baseName}`)
        try  {
            let tables  =  ctrl.getStateData<Map<string, TablesDefType>>('PgTables')
            let parseLine: Function = new Function( ...tables.get(tableName)!.readTmpl! )
            let lines: string[] = await this.readFile( filePath )
            lines.forEach( async ( line, index ) => {
                let row     = parseLine(line)
                let values  = Object.values(row).map(col => col === "''" || col === undefined  || col === null ? "NULL": col )
                let inserts = `( ${values.join(',')} )`.replace(/,,/mg, ',NULL,')
                if ( ! inserts.match( /\(\s* NULL,/ )) { // Not an empty Row
                    let stmt = `INSERT INTO ${tableName} VALUES ${inserts}`  
                    let result = await client.queryObject(stmt)
                }
            })
            let result = await client.queryObject(`UPDATE load_list SET ended = now(), success = true WHERE id = ${fileEntry.id}`)
        }
        catch(err) {
                throw new CxError( __filename, 'PgLoadData.loadTxtFile()', 'LOAD-0002',`Failed to build load text file for ${filePath}.`, err)
        }
    }


    validate( m: any[] ): boolean {
        let validated = false
        try {
            validated = ( m.length === 13 )
            m.forEach( ( val, idx) => {
                validated = validated && !_.isUndefined(val)
                if ( !validated ) return
                if ( idx === 4 || idx === 5 || idx === 7 || idx === 11 || idx === 12 ) {
                    validated = validated && ( val === 'NULL' || val === '' || ! ( Number.isNaN(Number.parseFloat(val)) ) )
                    if ( !validated ) console.log(`Column: ${idx} = ${val} failed number test`)
                }
                else {
                    validated = validated && ( val === 'NULL' || val === '' || val.match(/^'.*'$/) )
                    if ( !validated ) console.log(`Column: ${idx} = ${val} failed string test`)
                }
                if ( !validated ) return
            })
        }
        catch( err ) {
            console.log(err)
            validated = false
        }
        return validated
    }

    async loadDaily( fileEntry: LoadListType, client: Client ) {
        let baseName  = path.basename(fileEntry.filepath)
        let filePath = path.normalize(`${config.staging.stageDir}/files/${baseName}`)
        
        try  {
            let sharedCols: string[] 
            let batchStmtBundle: string[] = []
            let tables = ctrl.getStateData<Map<string, TablesDefType>>('PgTables')

            let parseMeasures: Function = new Function( ...tables.get('Measurements')!.readTmpl! )
            let insertPrefix: string = tables.get('Measurements')!.insert!
            let lines: string[] = await this.readFile( filePath )

            await client.queryObject(`UPDATE load_list SET started = now() WHERE id = ${fileEntry.id}`)

            lines.forEach( async ( line, index ) => {
                let insert: string[] = []
                let row = parseMeasures(line)

                let elems: any[] = [ row.ID, row.COUNTRY, row.NETC, row.STID, row.YEAR, row.MONTH, row.ELEMENT ]
                
                if ( row.ID !== `"''"` && row.ID !== `''`  ) { // Avoid empty row entries
                    // let insStmt =  elems.join(',').replace(/,,/mg, ',NULL,') 

                    let values = Object.values(row).map(col => col === "''" || col === undefined || col === null ? "NULL": col )
                    for( let offset = 7, i = 1 ; i < 32; i++, offset += 5 ) {
                        let isEmpty = true
                        let uniqCols = values.slice(offset, offset + 5 ) as string[]
                        //
                        // Move the DAY column to the end 
                        //
                        uniqCols.push(uniqCols[0])
                        //
                        // Fix empty column value bug in the data
                        //
                        if ( _.isUndefined(uniqCols[1]) ) uniqCols[1] = "NULL"
                        //
                        // Add the fileEntry.id
                        //
                        let uniqCols2 = elems.concat( uniqCols.slice(1) )
                        uniqCols2.push( `${fileEntry.id}` )

                        if ( this.validate(uniqCols2) ) {
                            insert.push(' (' +  uniqCols2.join(',').replace(/,,/mg, ',NULL,').replace(/\-9999/mg, 'NULL').replace(/,\s*''\s*,/mg,',NULL,') + ')' )
                        }
                        else {
                            console.error(`Bad row: ${uniqCols2}`)
                        }
                    } 
                    let result = {}
                    let insertStmt = insertPrefix + insert.join(',')
                    let reConnects = 0
                    while ( reConnects < 2 ) {
                        try {
                            result = await client.queryObject( insertStmt )
                        }
                        catch(err) {
                            //
                            // Try to reset connection 
                            //
                            reConnects++
                            if ( reConnects < 3 ) {
                                try { 
                                    try { client.end() } catch {} // Ignore
                                    await delay(2000)
                                    await client.connect()
                                    console.log(`RE-CONNECT: ${this.meta.swarmName ? this.meta.swarmName: this.meta.name}`)
                                } 
                                catch(err) {
                                    if ( reConnects < 3 )  throw new CxError( __filename, 'PgLoadData.loadDaily()', 'LOAD-0006',`Insert failed for ${insertStmt}`, err)
                                }   
                            }
                            else throw new CxError( __filename, 'PgLoadData.loadDaily()', 'LOAD-0006',`Insert failed for ${insertStmt}`, err)
                        }
                    }
                }   
            })
            let result = await client.queryObject(`UPDATE load_list SET ended = now(), success = true WHERE id = ${fileEntry.id}`)
            // if ( result.error )      
            //     throw new Error(result.error + ' ' + result.statement )
        }
        catch(err) {
                throw new CxError( __filename, 'PgLoadData.loadDaily()', 'LOAD-0004',`Failed to build load daily file for ${filePath}.`, err)
        }
    }

    async main() {
        let client: Client = this.getClient()
        let filecount = 0
        try {     
            await client.connect()
            let itor = ctrl.getContinuous< LoadListType[], LoadListType>('PgLoadData', 'LoadList', -1 , true)
            let obj: IteratorResult<any>

            while ( ( obj = await itor!.next() ) && ! obj.done ) {
                let fileEntry = obj.value[1] as LoadListType
                let objName = this.meta.swarmName ? this.meta.swarmName: this.meta.name

                console.log(` ${objName} LOADING: ${fileEntry.id} , ${fileEntry.filepath}` )

                let result = await client.queryObject(`UPDATE load_list SET started = now() WHERE id = ${fileEntry.id}`)
                // if ( result.error ) throw new Error(result.error)

                if ( fileEntry.filepath.endsWith('.txt') ) {
                    await this.loadTxtFile( fileEntry, client)
                }
                if ( fileEntry.filepath.endsWith('.dly') ) {
                    /*
                    if ( ++filecount % 20 === 0 ) { // To avoid timeout 
                        await client.end()
                        await client.connect()
                    }
                    */ 
                    await this.loadDaily( fileEntry, client )
                }
            } 
            console.log(`Exit due to no more itorater entries`)
        }
        catch(err) {
            throw new CxError( __filename, 'PgLoadData.main()', 'LOAD-0001',`Failed to handle entry.`, err)
        }
        finally {
            if ( this.isSwarmMaster() ) { 
                // The master is the last one to leave the swarm party, so it disposes of the iterator
                ctrl.iterators.get('PgLoadData')?.delete('LoadList')
            }
            await client.end()
        }
    }
}

