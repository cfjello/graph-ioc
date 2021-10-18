import { Action, action, iterate, CxIterator, CxContinuous } from '../mod.ts'
import { expect } from 'https://deno.land/x/expect/mod.ts'
import { CxError, _, ee } from "../../cxutil/mod.ts"

const __filename = new URL('', import.meta.url).pathname

type EntryType = {
    run: number,
    seq: number
}
type EntryNumArr = EntryType[]

//
// List Generator class
//
@action({
    state: [] as EntryType[],
    init: false
})
export class NumList extends Action<EntryType[]> {
    runs: number = 0
    seq: number = 0
    main(): Promise<boolean> {
        try {
            this.state = [] as EntryType[]
            for (let i = 0; i < 1000; i++) {
                let rec: EntryType = { run: this.runs, seq: i }
                this.state.push(rec)
            }
            this.publish()
            this.runs += 1
            this.seq += 1000
        }
        catch (err) {
            throw new CxError(__filename, 'NumList', 'TEST-XXXX', `NumList.main() failed.`, err)
        }
        return Promise.resolve(true)
    }
}



@action({
    state: [] as string[],
})
export class NumAppend extends Action<string[]> {
    constructor(public maxCount = 1000) {
        super()
    }
    async main(): Promise<boolean> {
        this.state = [] as string[]
        // console.log(`RUNNING ${ _.isUndefined(this.swarm!.swarmName!) ? this.meta.name : this.swarm!.swarmName }`)
        try {
            let iConf = {
                callee: this.meta.name,
                target: 'NumList',
                indexKey: this.getJobId(),
                nestedIterator: true,
                continuous: false
            }
            let cnt = 0
            let itor = await iterate.iteratorFactory<EntryType[], EntryType>(iConf) // as CxContinuous<EntryType[],EntryType>
            let obj: IteratorResult<EntryType>
            while (cnt++ < this.maxCount && itor && (obj = itor.next() as IteratorResult<EntryType>) && !obj.done) {
                let records = obj.value as any
                this.state.push(`run_${records[1].run}_${records[1].seq}`)
            }
            this.publish()
        }
        catch (err) {
            throw new CxError(__filename, 'NumAppend.main()', 'TEST-XXXX', `main(): ${JSON.stringify(err)}`, err)
        }
        return Promise.resolve(true)
    }
}

Deno.test({
    name: '08 - Continuous Nested Iterator can request one set of data',
    fn: async () => {
        let numList = await new NumList().register()
        let numAppend = await new NumAppend(1000).register('numAppend')
        numAppend.setDependencies('NumList')
        await numAppend.run()
        expect(numAppend.state).toBeDefined()
        expect(numAppend.state.length).toEqual(1000)
        expect(numAppend.state[numAppend.state.length - 1]).toEqual("run_0_999")
    },
    sanitizeResources: false,
    sanitizeOps: false
})




@action({
    state: [] as string[],
})
export class NumAppend2 extends Action<string[]> {
    constructor(public maxCount = 1000) { super() }
    async main(): Promise<boolean> {
        // console.log(`RUNNING ${ _.isUndefined(this.swarm!.swarmName!) ? this.meta.name : this.swarm!.swarmName }`)
        this.state = [] as string[]
        try {
            let iConf = {
                callee: this.meta.name,
                target: 'NumList2',
                indexKey: -1,
                nestedIterator: true,
                continuous: true
            }
            let cnt = 0
            let itor = await iterate.iteratorFactory<EntryType[], EntryType>(iConf)
            let obj: IteratorResult<EntryType>
            while (cnt++ < this.maxCount && itor && (obj = await itor.next() as IteratorResult<EntryType>) && !obj.done) {
                let records = obj.value as any
                this.state.push(`run_${records[1].run}_${records[1].seq}`)
            }
            this.publish()
        }
        catch (err) {
            throw new CxError(__filename, 'NumAppend.main()', 'TEST-XXXX', `main(): ${JSON.stringify(err)}`, err)
        }
        return Promise.resolve(true)
    }
}


Deno.test({
    name: '08 - Continuous Nested Iterator can request multiple sets of data',
    fn: async () => {
        let numList2 = await new NumList().register('NumList2')
        let numAppend2 = await new NumAppend2(6666).register()
        numAppend2.setDependencies('NumList2')
        await numAppend2.run()
        expect(numAppend2.state).toBeDefined()
        expect(numAppend2.state.length).toEqual(6666)
        expect(numAppend2.state[numAppend2.state.length - 1]).toEqual("run_6_665")
    },
    sanitizeResources: false,
    sanitizeOps: false
})
