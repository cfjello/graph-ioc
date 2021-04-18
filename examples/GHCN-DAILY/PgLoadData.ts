import { Client } from "https://deno.land/x/postgres/mod.ts";
// import { QueryObjectResult } from "https://deno.land/x/postgres/query/query.ts"
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import { delay }   from "https://deno.land/std/async/delay.ts"
import { parse as parseCsv } from 'https://deno.land/std@0.82.0/encoding/csv.ts';
import { ctrl, Action, action } from "../../cxctrl/mod.ts"
import { CxContinuous } from "../../cxstore/mod.ts"
import { CxError } from "../../cxutil/mod.ts"
import { _ } from "../../cxutil/mod.ts"
import { LoadListType, ConfigType, ColumnDefType, TablesDefType, RepeatingGroupType, HttpHeaderType } from "./interfaces.ts"
import { LoadList } from "./LoadList.ts"
import { config } from "./config.ts"

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
        let pgTableStations: TablesDefType = ( ctrl.getStateData("PgTables") as unknown as Map<string,TablesDefType> )!.get('Stations')! 
        let initialized = pgTableStations.initialized!
        if ( initialized ) {
            let client: Client = this.getClient()
            await client.connect()
            try {
                let result = await client.queryObject(`DELETE FROM Measurements WHERE MEASURE_ID IN ( SELECT ID FROM Measure WHERE FILE_ID IN ( SELECT id FROM load_list WHERE started IS NOT NULL AND ended IS NULL ) )`)
                console.log( `DELETED Measurements INCOMPLETE LOADED ROWS, num of. rows: ${result.rowCount}`)
                result = await client.queryObject(`DELETE FROM Measure WHERE FILE_ID IN ( SELECT id FROM load_list WHERE started IS NOT NULL AND ended IS NULL )`)
                console.log( `DELETED Measure INCOMPLETE LOADED ROWS, num of. rows: ${result.rowCount}`)
                await client.queryObject(`UPDATE load_list SET started = NULL WHERE started IS NOT NULL AND ended IS NULL`)
            }
            catch(err) {
                throw new CxError( __filename, 'PgLoadData.cleanup()', 'LOAD-0005',`Failed to cleanup the tables.`, err)
            }
            finally {
                client.end()
            }
        }
    }

    async loadTxtFile( fileEntry: LoadListType, client: Client) {
        let baseName  = path.basename(fileEntry.filepath)
        let tableName = this.initCap( baseName.replace(/^ghcnd-/, '').replace(/\.txt$/, '' ) ) 
        let filePath =  path.normalize(`${config.staging.stageDir}/textFiles/${baseName}`)
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

    async loadDailyHttp ( fileEntry: LoadListType, client: Client ) {
        let baseName = path.basename(fileEntry.filepath)
        let filePath = path.normalize(`${config.staging.stageDir}/files/${baseName}`) 
        let ignore = [ 'STATION', 'DATE', 'LATITUDE', 'LONGITUDE', 'NAME', 'ELEVATION' ]  
        let counter  = 0
        let ID       = -1 
        try {
            let lines = await parseCsv(await Deno.readTextFile(filePath), { skipFirstRow: true } )
            let result = await client.queryObject( `select nextval('MEASURE_id_seq')` )
            let idx   = 0 
            lines.forEach( async ( entry ) => {
                // console.log( entry)
                let ent = entry as unknown as HttpHeaderType 
                const STATION   = ent.STATION.trim()
                const DATO      = ent.DATE.trim()
                const LATITUDE  = ent.LATITUDE
                const LONGITUDE = ent.LONGITUDE
                const ELEVATION = ent.ELEVATION
                const NAME      = ent.NAME.trim()
                let COUNTRY     = NAME.substring( NAME.trim().lastIndexOf(',') + 1).trim()
                if ( idx++ === 0 ) {
                    try {
                        let sqlStmt = `INSERT INTO Measure VALUES ( ${result.rows[0].nextval as number} , '${STATION}', ${LATITUDE}, ${LONGITUDE}, ${ELEVATION}, '${NAME.substring(0, NAME.lastIndexOf(',')).trim()}', '${COUNTRY}', ${fileEntry.id} )`
                        await client.queryObject( sqlStmt )
                    }
                    catch(err) {
                        console.error( `FAILED to Measure insert:` + JSON.stringify(result)  )
                        throw new Error(err)
                    }
                }               
                let value: number | string | undefined
                let inserts: string[] = []
                for ( const [key, val] of Object.entries( entry as Object ) ) {
                    if ( ignore.includes(key) || key.lastIndexOf('_ATTRIBUTES') > 0 ) continue
                    //
                    // Here we handle the actual value fields
                    //
                    value = val !== undefined && val.trim().length > 0 ? parseInt(val.trim()) : 'NULL'
                    if ( value !== 'NULL' ) {
                        //
                        // Handle the attributes
                        //
                        let attr: string[] = []
                        for ( const [attrKey, attrVal] of Object.entries( entry as Map<string,string|number> ) ) {
                            if ( ignore.includes(key) ) continue
                            if ( attrKey === `${key}_ATTRIBUTES` ) {
                                (attrVal as string).split(',').forEach( (v: string) => attr.push ( v === undefined || v.length <= 0  ? 'NULL' : `'${v}'` ) )
                                break
                            }
                        }
                        // Build the insert stmt
                        //
                        inserts.push( `( ${result.rows[0].nextval as number}, '${STATION}', TO_DATE('${DATO}','YYYY-MM-DD'), '${key}', ${value}, ${attr[0]}, ${attr[1]}, ${attr[2]} )` )
                    }
                } 

                if ( inserts.length > 0 ) {
                    try {
                        await client.queryObject(`INSERT INTO Measurements VALUES ` + inserts.join(',') )
                    }
                    catch(err) {
                        console.error( `FAILED to insert:` + inserts.join(',') )
                        throw err
                    }
                }
            })
            await client.queryObject(`UPDATE load_list SET ended = now(), success = true WHERE id = ${fileEntry.id}`)
            console.log(` DONE: ${fileEntry.id} , ${path.basename(fileEntry.filepath)}` )
        }
        catch(err) {
            throw new CxError( __filename, 'PgLoadData.loadDailyHttp()', 'LOAD-0006',`Failed to build load daily file for ${filePath}.`, err)
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

                console.log(` ${objName} LOADING: ${fileEntry.id} , ${path.basename(fileEntry.filepath)}` )

                let result = await client.queryObject(`UPDATE load_list SET started = now() WHERE id = ${fileEntry.id}`)
                // if ( result.error ) throw new Error(result.error)

                if ( fileEntry.filepath.endsWith('.txt') ) {
                    await this.loadTxtFile( fileEntry, client)
                }
                if ( fileEntry.filepath.endsWith('.csv') ) {
                    await this.loadDailyHttp( fileEntry, client )
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

