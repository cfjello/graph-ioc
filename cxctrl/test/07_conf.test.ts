import { ctrl, Action, action } from '../mod.ts'
import { swarm  } from '../../cxswarm/mod.ts'
import { config } from '../../cxconfig/mod.ts'
import { NodeConfiguration } from '../../cxconfig/interfaces.ts'
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
swarm.setSwarmConfig('NumList', { minimum: 100 , maximum: 200, approach: 'interval', timerMS: 120000, skipFirst: 1 } )


Deno.test( {
    name: '07 - Configuration and defaults should be set ', 
    fn: async () => {
        let conf = config.nodeConfig.get('NumList') as NodeConfiguration
        expect ( conf ).toBeDefined()
        expect( conf.minimum ).toEqual(100)
        expect( conf.maximum ).toEqual(200)
        expect( conf.approach ).toEqual('interval')
        expect( conf.timerMS ).toEqual(120000)
        expect( conf.skipFirst ).toEqual(1)
    },
    sanitizeResources: false,
    sanitizeOps: false
})



