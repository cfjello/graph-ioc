import { Client } from "https://deno.land/x/postgres/mod.ts";
// import { QueryObjectResult } from "https://deno.land/x/postgres/query/query.ts"
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import { readLines } from "https://deno.land/std@0.93.0/io/mod.ts"
import { parse as parseCsv } from 'https://deno.land/std@0.82.0/encoding/csv.ts';
import { ctrl, Action, action, iterate } from "../../cxctrl/mod.ts"
import { CxContinuous } from "../../cxstore/mod.ts"
import { CxError } from "../../cxutil/mod.ts"
import { _ } from "../../cxutil/mod.ts"
import { LoadListType, 
         ConfigType, 
         ColumnDefType, 
         TablesDefType, 
         TablesType, 
         HttpHeaderType,
         AirTempType } from "./interfaces.ts"
import { LoadList } from "./LoadList.ts"
import { config } from "./config.ts"

import { textTables, dataTables } from "./PgTableDefs.ts"

export const __dirname = path.dirname( path.fromFileUrl(new URL('.', import.meta.url)) )

const __filename = new URL('', import.meta.url).pathname;

let toHHMMSS = function ( str: string ): string {
    var sec_num = parseInt(str, 10) as number
    var hours   = Math.floor(sec_num / 3600) as number
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60)
    var seconds = sec_num - (hours * 3600) - (minutes * 60)

    let hh = hours   < 10 ? `0${hours}` : hours.toString() 
    let mm = minutes < 10 ? `0${minutes}` : minutes.toString()
    let ss = seconds < 10 ? `0${seconds}` : seconds.toString() 
    return hh + ':' + mm + ':' + ss
}

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

    async loadTxtFile( fileEntry: LoadListType, client: Client) {
        let baseName  = path.basename(fileEntry.filepath)
        let tableName = this.initCap( baseName.replace(/^ghcnd-/, '').replace(/\.txt$/, '' ) ) 
        let filePath =  path.normalize(`${config.staging.stageDir}/textFiles/${baseName}`)

        try  {
            let pgTables: TablesType  =  ctrl.getStateData<TablesType>('PgTables')
            let fileName  = path.basename( fileEntry.filepath )
            let tableName:string = 'Unknown'
            for ( const [key, val] of textTables.entries() ) {
                if ( val.file === fileName ) {
                    tableName = key
                    break
                }
            }

            let parseLine: Function = new Function(  ... pgTables.tableDefs.get(tableName)!.readTmpl! )

            let fileReader = await Deno.open(filePath)
            for await ( let line  of readLines(fileReader) ) {
                let row     = parseLine(line)
                let values  = Object.values(row).map(col => col === "''" || col === undefined  || col === null ? "NULL": col )
                let inserts = `( ${values.join(',')} )`.replace(/,,/mg, ',NULL,')
                if ( ! inserts.match( /\(\s* NULL,/ )) { // Not an empty Row
                    let stmt = `INSERT INTO ${tableName} VALUES ${inserts}`  
                    let result = await client.queryObject(stmt)
                }
            }
            let result = await client.queryObject(`UPDATE load_list SET ended = now(), success = true WHERE id = ${fileEntry.id}`)
        }
        catch(err) {
                throw new CxError( __filename, 'PgLoadData.loadTxtFile()', 'LOAD-0002',`Failed to build load text file for ${filePath}.`, err)
        }
    }

    getAttributes( attrVal: string | undefined ): string[] {
        let atts: string[] = []
        if (  _.isUndefined(attrVal) || attrVal!.trim() === ',,' || attrVal === 'NULL') 
            atts = [ 'NULL', 'NULL', 'NULL']
        else 
            (attrVal as string).split(',').forEach( (v: string) => atts.push ( v === undefined || v.length <= 0  ? 'NULL' : `'${v}'` ) )
        return atts
    }


    /*
    TABLE:
    STATION     VARCHAR(11) NOT NULL,
    MDATE       DATE NOT NULL,
    TMAX        SMALLINT,
    TMIN        SMALLINT,
    TOBS        SMALLINT,
    TOBS        SMALLINT,
    SFLAG       CHAR(1),
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    TAVG_SFLAG  CHAR(1),
    TAVG_MFLAG  CHAR(1),
    TAVG_QFLAG  CHAR(1),
    */

    airBuffer: any[] = []

    async insertAir( ent:  { [index: string]: any } , client: Client ) { // (Partial<AirTempType & HttpHeaderType> 
        let fields = [ 'TMAX', 'TMIN', 'TOBS', 'TAVG'].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
        if ( fields.length > 0 ) {
            let airAttr: string[]
            let tavgAttr: string[]
            airAttr = this.getAttributes( ent.TMIN_ATTRIBUTES )
            tavgAttr = this.getAttributes( ent.TAVG_ATTRIBUTES )
            this.airBuffer.push(`('${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), ${ent.TMAX ?? 'NULL'}, ${ent.TMIN  ?? 'NULL'}, ${ent.TOBS  ?? 'NULL'}, ${ent.TAVG ?? 'NULL'}, ${airAttr[0]}, ${airAttr[1]}, ${airAttr[2]}, ${tavgAttr[0]}, ${tavgAttr[1]}, ${tavgAttr[2]})`)
            if ( this.airBuffer.length > 0 &&  this.airBuffer.length % 10000 ) {
                try {
                    await client.queryObject( `INSERT INTO Air VALUES ` + this.airBuffer.join(',') ) 
                    this.airBuffer = [] 
                }
                catch(err) {
                    // console.log(`FAILED AIR record: ${JSON.stringify(ent, undefined, 2)}`)
                    throw new CxError( __filename, 'PgLoadData.insertAir()', 'LOAD-0008',`Failed insert rows in AIR table.`, err)
                }
            }
        }
        /*
        else {
            console.log(`IGNORED record: ${JSON.stringify(ent, undefined, 2)}`)
        }
        */
    }
    /*
        STATION     VARCHAR(11) NOT NULL,
    MDATE       DATE NOT NULL,
    PRCP        SMALLINT, 
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    */ 
    rainBuffer: any[] = []

    async insertRain ( ent:  { [index: string]: any } , client: Client ) {
        let fields = [ 'PRCP'].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
        if ( fields.length > 0 ) {
            let attr = this.getAttributes( ent.PRCP_ATTRIBUTES )
            let prcp =  ent.PRCP.trim().match(/[0-9]+/) ?  parseInt(ent.PRCP.trim()) : 99767
            //
            // Guard against for some illigal values
            //
            if ( prcp >= -32768 && prcp <= 32767 ) { 
                this.rainBuffer.push ( `('${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), ${ent.PRCP ?? 'NULL'}, ${attr[0]}, ${attr[1]}, ${attr[2]})`)
            }
            else {
                console.log(`BAD RAIN ENTRY: ('${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), ${ent.PRCP ?? 'NULL'}, ${attr[0]}, ${attr[1]}, ${attr[2]})`)
            }
            
            if ( this.rainBuffer.length > 0 &&  this.rainBuffer.length % 10000 ) {
                try {
                    await client.queryObject( `INSERT INTO Rain VALUES ` + this.rainBuffer.join(',') ) 
                    this.rainBuffer = [] 
                }
                catch(err) {
                    // console.log(`FAILED RAIN record: ${JSON.stringify(ent, undefined, 2)}`)
                    throw new CxError( __filename, 'PgLoadData.inserRain()', 'LOAD-0009',`Failed insert row in RAIN table.`, err)
                }
            }
        }
    }
    /*
    STATION     VARCHAR(11) NOT NULL,
    MDATE       DATE NOT NULL,
    SNOW        SMALLINT,  
    SNWD        SMALLINT,
    WESD         SMALLINT,
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    */ 
    async insertSnow ( ent:  { [index: string]: any } , client: Client ) {
        let fields = [ 'SNOW', 'SNWD', 'WESD' ].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
        if ( fields.length > 0 ) {
            let attr = this.getAttributes( ent.SNOW_ATTRIBUTES )
            try {
                await client.queryObject( `INSERT INTO Snow VALUES ( '${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), ${ent.SNOW ?? 'NULL'}, ${ent.SNWD ?? 'NULL'}, ${ent.WESD ?? 'NULL'}, ${attr[0]}, ${attr[1]}, ${attr[2]} ) `) 
            }
            catch(err) {
                console.log(`FAILED SNOW record: ${JSON.stringify(ent, undefined, 2)}`)
                throw new CxError( __filename, 'PgLoadData.insertSnow()', 'LOAD-0010',`Failed insert row in SNOW table.`, err)
            }
        }
    }
    /*
    STATION     VARCHAR(11) NOT NULL,
    MDATE       DATE NOT NULL,
    PSUN        SMALLINT, 
    TSUN        SMALLINT,
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    */ 
    async insertSun ( ent:  { [index: string]: any } , client: Client ) {
        let fields = [ 'PSUN', 'TSUN' ].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
        if ( fields.length > 0 ) {
            let attr = this.getAttributes( ent.PSUN_ATTRIBUTES )
            try {
                await client.queryObject( `INSERT INTO Sun VALUES ( '${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), ${ent.PSUN ?? 'NULL'}, ${ent.TSUN ?? 'NULL'}, ${attr[0]}, ${attr[1]}, ${attr[2]} ) `) 
            }
            catch(err) {
                console.log(`FAILED SUN record: ${JSON.stringify(ent, undefined, 2)}`)
                throw new CxError( __filename, 'PgLoadData.insertSun()', 'LOAD-0011',`Failed insert row in SUN table.`, err)
            }
        }
    }
    /*
    STATION     VARCHAR(11) NOT NULL,
    MDATE       DATE NOT NULL,
    THIC        SMALLINT, 
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    */
    async insertIce ( ent:  { [index: string]: any } , client: Client ) {
        let fields = [ 'THIC' ].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
        if ( fields.length > 0 ) {
            let attr = this.getAttributes( ent.THIC_ATTRIBUTES )
            try {
                await client.queryObject( `INSERT INTO Ice VALUES ( '${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), ${ent.THIC ?? 'NULL'}, ${attr[0]}, ${attr[1]}, ${attr[2]} ) `) 
            }
            catch(err) {
                console.log(`FAILED ICE record: ${JSON.stringify(ent, undefined, 2)}`)
                throw new CxError( __filename, 'PgLoadData.insertIce()', 'LOAD-0012',`Failed insert row in ICE table.`, err)
            }
        }
    }
    /*
    STATION    VARCHAR(11) NOT NULL,
    MDATE      DATE NOT NULL,
    MNPN       SMALLINT,
    MXPN       SMALLINT,
    EVAP       SMALLINT,
    SFLAG      CHAR(1),
    MFLAG      CHAR(1),
    QFLAG      CHAR(1),
    */ 
    async insertEvaporation ( ent:  { [index: string]: any } , client: Client ) {
        let fields = [ 'MNPN', 'MXPN', 'EVAP' ].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
        if ( fields.length > 0 ) {
            let attr = this.getAttributes( ent.EVAP_ATTRIBUTES )
            try {
                await client.queryObject( `INSERT INTO Evaporation VALUES ( '${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), ${ent.MNPN ?? 'NULL'}, ${ent.MXPN ?? 'NULL'}, ${ent.EVAP ?? 'NULL'}, ${attr[0]}, ${attr[1]}, ${attr[2]} ) `) 
            }
            catch(err) {
                console.log(`FAILED EVAPORATION record: ${JSON.stringify(ent, undefined, 2)}`)
                throw new CxError( __filename, 'PgLoadData.insertEvaporation()', 'LOAD-0013',`Failed insert row in EVAPORATION table.`, err)
            }
        }
    }
    /*
    STATION       VARCHAR(11) NOT NULL,
    MDATE         DATE NOT NULL,
    ACMC          SMALLINT,
    ACMH          SMALLINT,
    ACSC          SMALLINT,
    ACSH          SMALLINT,
    SFLAG       CHAR(1),
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    */ 
    async insertCloud ( ent:  { [index: string]: any } , client: Client ) {
        let fields = [ 'ACMC', 'ACMH', 'ACSC', 'ACSH' ].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
        if ( fields.length > 0 ) {
            let attr = this.getAttributes( ent.ACMC_ATTRIBUTES )
            try {
                await client.queryObject( `INSERT INTO Cloud VALUES ( '${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), ${ent.ACMC ?? 'NULL'}, ${ent.ACMH ?? 'NULL'}, ${ent.ACSC ?? 'NULL'}, ${ent.ACSH ?? 'NULL'}, ${attr[0]}, ${attr[1]}, ${attr[2]} ) `) 
            }
            catch(err) {
                console.log(`FAILED CLOUD record: ${JSON.stringify(ent, undefined, 2)}`)
                throw new CxError( __filename, 'PgLoadData.insertCloud()', 'LOAD-0014',`Failed insert row in CLOUD table.`, err)
            }
        }
    }
    /*
    STATION     VARCHAR(11)  NOT NULL,
    MDATE       DATE NOT NULL, 
    WT          CHAR(4),
    WT_MFLAG    CHAR(1),
    WT_QFLAG    CHAR(1),
    WT_SFLAG    CHAR(1),
    WV          CHAR(4),
    WV_MFLAG    CHAR(1),
    WV_QFLAG    CHAR(1),
    WV_SFLAG    CHAR(1),
    */
    async insertWeather ( ent:  { [index: string]: any } , client: Client ) {
        let wtFound = false
        let wvFound = false
        let wtArr: string[] = []
        let wvArr: string[] = []
        for (const [key, value] of Object.entries(ent)) {
            if ( key.match(/^WT[0-9][0-9]$/) && value !== 'NULL' && value.trim().length > 0 ) {
                // if ( wtFound ) console.log( `Multiple Weather types found for: ${JSON.stringify(ent, undefined, 2)}`)
                ent.WT = key.trim().substr(2,2)
                ent.WT_ATTRIBUTES = ent[`${key}_ATTRIBUTES`]
                wtArr.push(key.trim().substr(2,2) )
                wtFound = true
            }
            else if ( key.match(/^WV[0-9][0-9]$/) && value !== 'NULL' && value.trim().length > 0 ) {
                // if ( wvFound ) console.log( `Multiple Weather in Vicinity types found for: ${JSON.stringify(ent, undefined, 2)}`)
                ent.WV = key.trim().substr(2,2)
                ent.WV_ATTRIBUTES = ent[`${key}_ATTRIBUTES`]
                wvArr.push( key.trim().substr(2,2) )
                wvFound = true
            }
        }
        if ( wtFound || wvFound ) {
            let fields = [ 'WT', 'WV' ].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
            if ( fields.length > 0 ) {
                let attr  = this.getAttributes( ent.WT_ATTRIBUTES ) // TODO: Check WT and WV names against what is actually read from the file
                let attr1 = this.getAttributes( ent.WV_ATTRIBUTES )
                try {
                    for ( let i = 0; i < wtArr.length; i++ ) {
                        let WT = wtArr[i]
                        let WV = i < wvArr.length ? wvArr[i] : _.isUndefined( ent.WV ) ? 'NULL' : ent.WV
                        await client.queryObject( `INSERT INTO Weather VALUES ( '${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), ${WT ?? 'NULL'}, ${attr[0]}, ${attr[1]}, ${attr[2]}, ${WV ?? 'NULL'}, ${attr1[0]}, ${attr1[1]}, ${attr1[2]}  ) `) 
                    }
                }
                catch(err) {
                    console.log(`FAILED WEATHER record: ${JSON.stringify(ent, undefined, 2)}`)
                    throw new CxError( __filename, 'PgLoadData.insertWeather()', 'LOAD-0015',`Failed insert row in WEATHER table.`, err)
                }
            }
        }
    }
    /*
    STATION    VARCHAR(11)  NOT NULL,
    MDATE      DATE NOT NULL,

    AWDR          SMALLINT,
    AWND          SMALLINT,
    PGTM          TIME,

    WSF1          SMALLINT,
    WDF1          SMALLINT,
    WSF2          SMALLINT,
    WDF2          SMALLINT,

    WSF5          SMALLINT,
    WDF5          SMALLINT,
    WSFG          SMALLINT,
    WSFI          SMALLINT,

    WSFM          SMALLINT,
    FMTM          TIME,
    WDMV          SMALLINT,
    
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    */

    async insertWind ( ent:  { [index: string]: any } , client: Client ) {
        let fields = [ 'AWDR', 'AWND', 'WSF1', 'WDF1', 'WSF2', 'WDF2', 'WSF5', 'WDF5', 'WSFG', 'WSFI', 'WSFM', 'WDMV' ].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
        if ( fields.length > 0 ) {
            let attr = this.getAttributes( ent.AWND_ATTRIBUTES )
            let PGTM = _.isUndefined( ent.PGTM ) || ent.PGTM === 'NULL' || ent.PGTM.trim().length === 0 ? 'NULL' : ent.PGTM.trim()
            let FMTM = _.isUndefined( ent.FMTM ) || ent.FMTM === 'NULL' || ent.FMTM.trim().length === 0 ? 'NULL' : ent.FMTM.trim()

            if ( PGTM !== 'NULL' ) {
                if ( PGTM.match( /^[012][0-9][012][0-9]$/) ) {
                    // hours and minutes 
                    PGTM = `'${PGTM.substr(0,2) + ':' + PGTM.substr(2,2)}'`
                }
                else {
                    if ( PGTM.match( /^[0-9]+$/) ) {
                    // seconds
                    PGTM = `'${toHHMMSS(PGTM)}'`
                    }
                }
            }
            if ( FMTM !== 'NULL' ) {
                if ( FMTM.match( /^[012][0-9][012][0-9]$/) ) {
                    // hours and minutes 
                    FMTM = `'${FMTM.substr(0,2) + ':' + FMTM.substr(2,2)}'`
                }
                else {
                    if ( FMTM.match( /^[0-9]+$/) ) {
                    // seconds
                    FMTM = `'${toHHMMSS(FMTM)}'`
                    }
                }
            }
            try {
                await client.queryObject( `INSERT INTO Wind VALUES ( '${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), 
                                                                      ${ent.AWDR ?? 'NULL'}, ${ent.AWND ?? 'NULL'}, ${PGTM}, 
                                                                      ${ent.WSF1 ?? 'NULL'}, ${ent.WDF1 ?? 'NULL'}, ${ent.WSF2 ?? 'NULL'},   ${ent.WDF2 ?? 'NULL'},
                                                                      ${ent.WSF5 ?? 'NULL'}, ${ent.WDF5 ?? 'NULL'}, ${ent.WSFG ?? 'NULL'},   ${ent.WSFI ?? 'NULL'},  
                                                                      ${ent.WSFM ?? 'NULL'}, ${FMTM}, ${ent.WDMV ?? 'NULL'}, 
                                                                      ${attr[0]}, ${attr[1]}, ${attr[2]} ) `) 
            }
            catch(err) {
                console.log(`FAILED WIND record: ${JSON.stringify(ent, undefined, 2)}`)
                throw new CxError( __filename, 'PgLoadData.insertWind()', 'LOAD-0016',`Failed insert row in WIND table.`, err)
            }
        }
    }
    
    /*
    STATION    VARCHAR(11)  NOT NULL,
    MDATE      DATE NOT NULL,
    SN_MIN      SMALLINT,
    SX_MAX      SMALLINT,
    COVER       SMALLINT,
    COVER_TXT   VARCHAR(16),
    COVER_DEPTH SMALLINT,
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    */

    async insertSoil ( ent:  { [index: string]: any } , client: Client ) {
        let snFound = false
        let sxFound = false
        for (const [key, value] of Object.entries(ent)) {
            if ( key.match(/^SN[0-9][0-9]$/) && value !== 'NULL' && value.trim().length > 0 ) {
                if ( snFound )
                   console.log( `Multiple Soil Min temperatures found for: ${JSON.stringify(ent, undefined, 2)}`)
                else {
                   ent.SN_MIN      = value.trim()
                   ent.COVER       = key.trim().charAt(2)
                   ent.COVER_DEPTH = key.trim().charAt(3)
                   ent.S_ATTRIBUTES = ent[`${key}_ATTRIBUTES`]
                   snFound = true
                }
            }
            else if ( key.match(/^SX[0-9][0-9]$/) && value !== 'NULL' && value.trim().length > 0 ) {
                if ( sxFound )
                    console.log( `Multiple  Soil Max temperatures found for: ${JSON.stringify(ent, undefined, 2)}`)
                else {
                    ent.SN_MAX      = value.trim()
                    ent.COVER       = key.trim().charAt(2)
                    ent.COVER_DEPTH = key.trim().charAt(3)
                    ent.S_ATTRIBUTES = ent[`${key}_ATTRIBUTES`]
                    sxFound = true
                 }  
            }
        }
        if ( snFound || sxFound ) {
            console.log(`FOUND SOIL record: ${JSON.stringify(ent, undefined, 2)}`)
            let fields = [ 'SN_MIN', 'SX_MAX', 'COVER', 'COVER_DEPTH' ].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
            if ( fields.length > 0 ) {
                let attr = this.getAttributes( ent.S_ATTRIBUTES ) // TODO: Check SN_MIN and SX_MAX names against what is actually read from the file
                let groundCover = [ 'unknown', 'grass', 'fallow', 'bare ground', 'brome grass', 'sod', 'straw multch', 'grass muck', 'bare muck' ][ ent.COVER ?? 0 ]
                let coverDepth = [ -1, 5, 10, 20, 50, 100, 150, 180 ][ ent.COVER_DEPTH ?? 0 ]
                try {
                    await client.queryObject( `INSERT INTO Soil VALUES ( '${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), 
                                                                        ${ent.SN_MIN ?? 'NULL'}, ${ent.SX_MAX ?? 'NULL'},  
                                                                        ${ent.COVER ?? 'NULL'}, '${groundCover}', ${coverDepth}, 
                                                                        ${attr[0]}, ${attr[1]}, ${attr[2]} ) `) 
                }
                catch(err) {
                    console.log(`FAILED SOIL record: ${JSON.stringify(ent, undefined, 2)}`)
                    throw new CxError( __filename, 'PgLoadData.insertSoil()', 'LOAD-0017',`Failed insert row in SOIL table.`, err)
                }
            }
        }
    }

    /*
    MDTN        SMALLINT,
    DATN        SMALLINT,
    MDTX        SMALLINT,
    DATX        SMALLINT,
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    */ 

    async insertAir_MD ( ent:  { [index: string]: any } , client: Client ) {
        let fields = [ 'MDTN', 'DATN', 'MDTX', 'DATX' ].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
        if ( fields.length > 0 ) {
            let attr = this.getAttributes( ent.MDTN_ATTRIBUTES )
            try {
                await client.queryObject( `INSERT INTO Air_MD VALUES ( '${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), 
                                                                      ${ent.MDTN ?? 'NULL'}, ${ent.DATN ?? 'NULL'},  
                                                                      ${ent.MDTX ?? 'NULL'}, ${ent.DATX ?? 'NULL'}, 
                                                                      ${attr[0]}, ${attr[1]}, ${attr[2]} ) `) 
            }
            catch(err) {
                console.log(`FAILED Air_MD record: ${JSON.stringify(ent, undefined, 2)}`)
                throw new CxError( __filename, 'PgLoadData.insertAir_MD()', 'LOAD-0018',`Failed insert row in Air_MD table.`, err)
            }
        }
    }

    /*
    MDPR        SMALLINT,
    DAPR        SMALLINT,
    DWPR        SMALLINT,
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    */

    async insertRain_MD ( ent:  { [index: string]: any } , client: Client ) {
        let fields = [ 'MDPR', 'DAPR', 'DWPR' ].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
        if ( fields.length > 0 ) {
            let attr = this.getAttributes( ent.MDPR_ATTRIBUTES )
            try {
                await client.queryObject( `INSERT INTO Rain_MD VALUES ( '${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), 
                                                                      ${ent.MDPR ?? 'NULL'}, ${ent.DAPR ?? 'NULL'}, ${ent.DWPR ?? 'NULL'},
                                                                      ${attr[0]}, ${attr[1]}, ${attr[2]} ) `) 
            }
            catch(err) {
                console.log(`FAILED Rain_MD record: ${JSON.stringify(ent, undefined, 2)}`)
                throw new CxError( __filename, 'PgLoadData.insertRain_MD', 'LOAD-0019',`Failed insert row in Rain_MD table.`, err)
            }
        }
    }

    /*
    MDSF        SMALLINT,
    DASF        SMALLINT,
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    */
    async insertSnow_MD ( ent:  { [index: string]: any } , client: Client ) {
        let fields = [ 'MDSF', 'DASF' ].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
        if ( fields.length > 0 ) {
            let attr = this.getAttributes( ent.MDSF_ATTRIBUTES )
            try {
                await client.queryObject( `INSERT INTO Snow_MD VALUES ( '${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), 
                                                                      ${ent.MDSF ?? 'NULL'}, ${ent.DASF ?? 'NULL'},
                                                                      ${attr[0]}, ${attr[1]}, ${attr[2]} ) `) 
            }
            catch(err) {
                console.log(`FAILED Snow_MD record: ${JSON.stringify(ent, undefined, 2)}`)
                throw new CxError( __filename, 'PgLoadData.insertSnow_MD', 'LOAD-0020',`Failed insert row in Snow_MD table.`, err)
            }
        }
    }  
    
    /*
    MDWM        SMALLINT,
    DAWM        SMALLINT,
    MFLAG       CHAR(1),
    */
    async insertWind_MD ( ent:  { [index: string]: any } , client: Client ) {
        let fields = [ 'MDWM', 'DAWM' ].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
        if ( fields.length > 0 ) {
            let attr = this.getAttributes( ent.MDWM_ATTRIBUTES )
            try {
                await client.queryObject( `INSERT INTO Wind_MD VALUES ( '${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), 
                                                                      ${ent.MDWM ?? 'NULL'}, ${ent.DAWM ?? 'NULL'},
                                                                      ${attr[0]}, ${attr[1]}, ${attr[2]} ) `) 
            }
            catch(err) {
                console.log(`FAILED Wind_MD record: ${JSON.stringify(ent, undefined, 2)}`)
                throw new CxError( __filename, 'PgLoadData.insertWind_MD', 'LOAD-0021',`Failed insert row in Wind_MD table.`, err)
            }
        }
    }

    /*
    MDEV        SMALLINT,
    DAEV        SMALLINT, 
    */ 
    async insertEvaporation_MD ( ent:  { [index: string]: any } , client: Client ) {
        let fields = [ 'MDEV', 'DAEV' ].filter( e =>  { if ( e in ent && !_.isUndefined( ent[e] ) && ent[e] !== 'NULL' ) return e } )
        if ( fields.length > 0 ) {
            let attr = this.getAttributes( ent.MDEV_ATTRIBUTES )
            try {
                await client.queryObject( `INSERT INTO Evaporation_MD VALUES ( '${ent.STATION}', TO_DATE('${ent.DATE}','YYYY-MM-DD'), 
                                                                      ${ent.MDEV ?? 'NULL'}, ${ent.DAEV ?? 'NULL'},
                                                                      ${attr[0]}, ${attr[1]}, ${attr[2]} ) `) 
            }
            catch(err) {
                console.log(`FAILED Evaporation_MD record: ${JSON.stringify(ent, undefined, 2)}`)
                throw new CxError( __filename, 'PgLoadData.insertEvaporation_MD', 'LOAD-0022',`Failed insert row in Evaporation_MD table.`, err)
            }
        }
    }

    async loadDailyHttp ( fileEntry: LoadListType, client: Client ) {
        let baseName = path.basename(fileEntry.filepath)
        let filePath = path.normalize(`${config.staging.stageDir}/files/${baseName}`) 
        let ignore = [ 'STATION', 'DATE', 'LATITUDE', 'LONGITUDE', 'NAME', 'ELEVATION' ]  
        let counter  = 0
        try {
            let fileReader = await Deno.open(filePath)
            // let result = await client.queryObject( `select nextval('MEASURE_id_seq')` )
            let idx   = 0 
            let columns: string[] = []
            for await ( let line  of readLines(fileReader) ) {
                if ( idx === 0 ) {
                    columns = line.replace(/"/g, '').split(',')
                    idx++
                }
                else if ( line.length > 0 ) {
                    let parseRes = await parseCsv( line, { 
                        skipFirstRow: false, 
                        columns: columns,
                        parse:  (e: any): unknown => {
                            for ( const [key, val] of Object.entries( e as Object ) ) {
                                if ( _.isUndefined(val) || ( typeof val === 'string' && val.trim().length === 0 ) || ( typeof val === 'number' && val.toString().length === 0 ) ) {
                                    e[key] = 'NULL'
                                }
                                else if ( typeof val === 'string'  ) {
                                        e[key] = val.trim()
                                    }
                            }
                            return e
                        }    
                    }) 
                    let ent = parseRes[0] as unknown as HttpHeaderType 
                    ent.COUNTRY     = ent.NAME.substring( ent.NAME.lastIndexOf(',') + 1).trim()
                    if ( idx++ === 1 ) { // First row after the header row
                        try {
                            await client.queryObject( `INSERT INTO Stations VALUES ( '${ent.STATION}', ${ent.LATITUDE}, ${ent.LONGITUDE}, ${ (ent.ELEVATION.toString().length === 0 ) ? 'NULL': ent.ELEVATION }, '${ent.NAME.substring(0, ent.NAME.lastIndexOf(',')).trim()}', '${ent.COUNTRY}', ${fileEntry.id} )` )
                        }
                        catch(err) {
                            new CxError( __filename, 'PgLoadData.loadDailyHttp()', 'LOAD-0007',`Failed to insert ${filePath}: ( '${ent.STATION}', ${ent.LATITUDE}, ${ent.LONGITUDE}, ${ent.ELEVATION}, '${ent.NAME.substring(0, ent.NAME.lastIndexOf(',')).trim()}', '${ent.COUNTRY}', ${fileEntry.id} )`, err)
                        }
                    }
                    await this.insertAir( ent as Partial<HttpHeaderType & AirTempType> , client )
                    await this.insertRain( ent as Partial<HttpHeaderType & AirTempType> , client )
                    await this.insertSnow( ent as Partial<HttpHeaderType & AirTempType> , client )
                    await this.insertSun( ent as Partial<HttpHeaderType & AirTempType> , client )
                    await this.insertIce( ent as Partial<HttpHeaderType & AirTempType> , client )
                    await this.insertEvaporation( ent as Partial<HttpHeaderType & AirTempType> , client )
                    await this.insertCloud( ent as Partial<HttpHeaderType & AirTempType> , client )
                    await this.insertWeather( ent as Partial<HttpHeaderType & AirTempType> , client )
                    await this.insertWind( ent as Partial<HttpHeaderType & AirTempType> , client )
                    await this.insertSoil( ent as Partial<HttpHeaderType & AirTempType> , client )
                    await this.insertAir_MD( ent as Partial<HttpHeaderType & AirTempType> , client )
                    await this.insertRain_MD( ent as Partial<HttpHeaderType & AirTempType> , client )
                    await this.insertSnow_MD( ent as Partial<HttpHeaderType & AirTempType> , client )
                    await this.insertEvaporation_MD( ent as Partial<HttpHeaderType & AirTempType> , client )
                }
            }
            await client.queryObject(`UPDATE load_list SET ended = now(), success = true WHERE id = ${fileEntry.id}`)
            console.log(` DONE: ${fileEntry.id} , ${path.basename(fileEntry.filepath)}` )
        }
        catch(err) {
            throw new CxError( __filename, 'PgLoadData.loadDailyHttp()', 'LOAD-0006',`Failed to build load daily file for ${filePath}.`, err)
        }

    }
   
    async main() {
        let client: Client = this.getClient()
        // let filecount = 0
        try {     
            await client.connect()
            let iConf = {
                callee: 'PgLoadData', 
                target: 'LoadList', 
                indexKey: -1, 
                nestedIterator: true,
                continuous: true
            } 
            let itor = iterate.iteratorFactory< LoadListType[], LoadListType>( iConf )
            
            // ctrl.getContinuous< LoadListType[], LoadListType>('PgLoadData', 'LoadList', -1 , true)
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
            if ( this.airBuffer.length > 0 )  await client.queryObject( `INSERT INTO Air VALUES ` + this.airBuffer.join(',') ) 
            if ( this.rainBuffer.length > 0 ) await client.queryObject( `INSERT INTO Rain VALUES ` + this.rainBuffer.join(',') )
            if ( this.swarm.isMaster() ) { 
                // The master is the last one to leave the swarm party, so it disposes of the iterator
                iterate.iterators.get('PgLoadData')?.delete('LoadList')
            }
            await client.end()
        }
    }
}

