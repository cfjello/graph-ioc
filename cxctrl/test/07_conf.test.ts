import { ctrl, Action, action, swarm  }  from '../mod.ts'
import { NodeConfiguration } from '../interfaces.ts'
import { expect } from 'https://deno.land/x/expect/mod.ts'
import { CxError, _ , ee } from "../../cxutil/mod.ts"

const __filename = new URL('', import.meta.url).pathname

type EntryType = {
    run: number,
    seq: number
}
@action({
    state: [] as EntryType[],
    init: false
})
export class NumList extends Action<EntryType[]> {
    runs: number = 0
    seq:  number = 0
    main (): Promise<boolean> {
        try {
            this.state = [] as EntryType[]
            for ( let i = 0; i < 1000; i++ )   {
                let rec: EntryType = { run: this.runs, seq: i } 
                this.state.push( rec )
            }
            this.publish()
            this.runs += 1
            this.seq += 1000
        }
        catch( err) {
            throw new CxError( __filename, 'NumList', 'TEST-XXXX',`NumList.main() failed.`, err)
        }
        return Promise.resolve(true)
    }
}

let numList = await new NumList().register()
swarm.setSwarmConfig('NumList', { swarmSeed: 100 , swarmMax: 200, approach: 'interval'} )


Deno.test( {
    name: '07 - Configuration and defaults should be set ', 
    fn: async () => {
        let config = ctrl.graph.getNodeData('NumList') as NodeConfiguration
        expect ( config ).toBeDefined()
        expect( config.swarmSeed ).toEqual(100)
        expect( config.swarmMax ).toEqual(200)
        expect( config.approach ).toEqual('interval')
        expect( config.timerInterval ).toEqual(120000)
        expect( config.skipFirst ).toEqual(1)
    },
    sanitizeResources: false,
    sanitizeOps: false
})



