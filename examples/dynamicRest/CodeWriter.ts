import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import {ctrl, Action, action} from '../../cxctrl/mod.ts'
// import * as serialize  from 'serialize-javascript'
import { $log } from '../../cxutil/mod.ts'
import { RenderingType } from './CodeRender.ts'
import { SqlParseType, SchemaEntryType } from './MysqlDumpParser.ts'

//
// Class related Type Definitions
//
export type ModelFileType = { 
    fileDir?: string 
    fileNames: string[]
} 

@action<ModelFileType>({
    state: {

        fileNames: []
    }
} )
export class CodeWriter extends Action<ModelFileType> {
    codeRender: Readonly <RenderingType> = {} as RenderingType
    dataMap: Readonly <SqlParseType> =  {} as SqlParseType

    writeFile() {
        try {
            this.codeRender.models.forEach((value, fileName ) => {
                let filePath = path.resolve(`${ctrl.__dirname}/examples/dynamicRest/resources/${fileName}`)
                let content = value.join('\n')
                Deno.writeTextFileSync(filePath, content )
                this.state.fileNames.push(fileName)
            })
            this.dataMap.forEach((data, schema ) => {
                let dataPath = path.resolve(`${ctrl.__dirname}/examples/dynamicRest/resources/${schema}.data`)
                let content = data.inserts!.values.join('\n')
                Deno.writeTextFileSync(dataPath, content )
            })
        }
        catch(err) {
            $log.error(`MysqlDumpReader: ${err}`)
        }
    }
    
    main() {
        this.codeRender = ctrl.getState('CodeRender')
        this.dataMap = ctrl.getState('MysqlDumpParser')
        this.writeFile()
        this.publish()
    }
}