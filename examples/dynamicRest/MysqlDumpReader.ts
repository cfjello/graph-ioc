import { ctrl, Action, action } from '../../cxctrl/mod.ts'
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
// import { $log } from '../../cxutil/mod.ts'
// import * as fs from 'fs'
// import * as util from 'util'

//
// Class related Type Definitions
//
export type DumpFile = { 
    filePath?: string , 
    data?: string 
} 

//
// Read a Mysql Dump file
//
@action<DumpFile>({
    ctrl: 'readFile',
    state: { filePath: `./data/mysqlsampledatabase.sql`, data: "" }
} )
export class MysqlDumpReader extends Action<DumpFile> { 
    readFile():void {
        try {
            // let data = Deno.readFileSync( this.state.filePath! ).toString()
            this.state.data = Deno.readTextFileSync( path.resolve(`${ctrl.__dirname}/examples/dynamicRest/${this.state.filePath!}`) )
            this.publish()
        }
        catch(err) {
            throw Error(`MysqlDumpReader(): ${err}`)
        }
    }   
}
