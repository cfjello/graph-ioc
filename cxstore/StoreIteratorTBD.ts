import { store } from "../cxctrl/Ctrl.ts"
import { _ , CxError} from "../cxutil/mod.ts"

const __filename = new URL('', import.meta.url).pathname;

export class StoreIterator<S> {
    storeIndexEntries!:  Array<number>
    
    constructor(public storeKey: string, public indexNameId: string, public indexIdx: number = 0, prefix: string = 'J' ) {
        let indexName = prefix + indexNameId
        if ( store.index.has(indexName) && store.index.get(indexName)!.has(storeKey) ) {
            this.storeIndexEntries = store.index.get(indexName)?.get(storeKey)! 
        }
        else {
            throw new CxError(__filename, 'StoreIterator.constructor()', 'STORE-0013', `Index target: ${indexName}.${storeKey}, does not exist in the Store`)
        }      
    }

    next() {
        let done = false 
        let value = undefined
        // Go past any deleted entries
        do {
            if ( this.indexIdx >= this.storeIndexEntries!.length ) {
                done  = true
                value = undefined
            }
            else {
                let storeId = this.storeIndexEntries[this.indexIdx++ ]
                if ( ! _.isUndefined( storeId ) && store.hasStoreId(this.storeKey, storeId)) {
                    value = done ? undefined : store.get( this.storeKey, storeId )
                }
            }
        } while ( !done && _.isUndefined( value ) )

        return { value: value, done: done }
    }

    reset() {
        this.indexIdx = 0
    }
}