import { ctrl, Action, action, iterate} from "../../cxctrl/mod.ts"
import { swarm } from "../mod.ts"
import { SwarmChildType } from "../interfaces.ts"
import { CxIterator } from "../../cxstore/mod.ts"
import { CxError, _ , ee } from "../../cxutil/mod.ts"
// import { delay } from 'https://deno.land/x/delay/mod.ts'
import { expect } from 'https://deno.land/x/expect/mod.ts'

const __filename = new URL('', import.meta.url).pathname

type ST = { runName: string }


@action({
    state: [] as string[],
    init: false
})
export class FileList extends Action<string[]> {
    runs: number = 0

    main (): Promise<boolean> {
        this.state = [] as string[]
        try {
            for ( let i = 0; i < 1000; i++ )   {
                // let obj: ST = { runrunName: `${this.runs}_${i}` as string }
                this.state.push( `${this.runs}_${i}` as string )
            }
            this.publish()
        }
        catch( err) {
            throw new CxError( __filename, 'FileList', 'TEST-0001',`fileList.main() failed.`, err)
        }
        return Promise.resolve(true)
    }
}

@action({
    state:  [] as string[],
})
export class FileAppend extends Action<string[]> {
    
    async main(): Promise<boolean> {   
        this.state = [] as string[]
        try {
            let itor: CxIterator<string[], string> 
            itor = iterate.getIterator<string[],string>('FileAppend', 'FileList', this.getJobId(), true ) as CxIterator<string[],string> 
            let obj: IteratorResult<any>
            while ( itor && (obj = itor.next() )  &&  ! obj.done ) {
                let val = obj.value[1].runName as string
                this.state.push( `${val}_kilroy_was_here` as string  ) 
                this.publish()
            } 
        }
        catch ( err ) {
            throw new CxError( __filename, 'FileAppend.main()', 'TEST-0002',`main(): ${JSON.stringify(err)}`, err)
        }
    return Promise.resolve(true)
    }
}

let fileList = await new FileList().register()
let fileAppend = await new FileAppend().register()

fileAppend.setDependencies('FileList')

swarm.swarmConfig('FileAppend', 3, 3)

await swarm.addSwarm('FileAppend' )

await fileAppend.run()

Deno.test( {
    name: '09 - Swarm Master has the correct variables set', 
    fn: () => {
        expect( ctrl.store.has('FileList') ).toBeTruthy()
        expect( fileAppend.isSwarmMaster()).toBeTruthy()
        expect ( fileAppend.swarm.swarmLsnr).toBeDefined()
        expect( fileAppend.getName() ).toEqual(fileAppend.meta.name) 
        expect( fileAppend.swarm.children.length ).toEqual(3)
        expect( fileAppend.swarm.canRun).toBeTruthy()
    
    },
    sanitizeResources: false,
    sanitizeOps: false
})


Deno.test( {
    name: '09 - Swarm children has the correct variables set', 
    fn: async () => {
        fileAppend.swarm.children.forEach( (value: string, index: number) => {
            let sObj = ctrl.actions.get(value)!
            expect( sObj.meta.name ).toEqual(fileAppend.meta.name)
            expect( fileAppend.swarm.swarName ).not.toEqual(fileAppend.meta.name)
            expect ( (sObj.swarm as SwarmChildType).swarmLsnr).toBeDefined()
            expect( sObj.swarm!.canRun).toBeTruthy()
            expect( sObj.isSwarmMaster()).toBeFalsy()
        })
    },
    sanitizeResources: false,
    sanitizeOps: false
})

Deno.test( {
    name: '09 - FileAppend has appended to FileList', 
    fn: async () => {
        expect( ctrl.store.has('FileAppend') ).toBeTruthy()
        expect( (ctrl.getStateData('FileAppend', -1) as string[]) ).toBeDefined()
        let itorL = iterate.getIterator<string[],string>('FileAppend', 'FileList', fileList.getJobId(), true )
        let countL = itorL!.entryCounter
        let iter = iterate.getIterator<string[],string>('FileAppend', 'FileAppend', fileAppend.getJobId() )
        let count = 0
        let obj: any
        while ( iter && (obj = iter.next() )  &&  ! obj.done ) {
            count++
        }
        expect( count).toEqual(countL)
    },
    sanitizeResources: false,
    sanitizeOps: false
})



