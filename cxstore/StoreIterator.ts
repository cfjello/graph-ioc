import { store } from "../cxctrl/Ctrl.ts"
import { _ , CxError} from "../cxutil/mod.ts"

const __filename = new URL('', import.meta.url).pathname;

export class StoreIterator<T> implements Iterator<T>{
    storeIndexEntries!:  Array<number>
    
    constructor(public storeKey: string, public indexKeyId: string, public indexCounter: number = 0, prefix: string = 'J' ) {
        let indexName = prefix + indexKeyId
        if ( store.index.has(indexName) && store.index.get(indexName)!.has(storeKey) ) {
            this.storeIndexEntries = store.index.get(indexName)?.get(storeKey)! 
        }
        else {
            throw new CxError(__filename, 'StoreIterator.constructor()', 'STORE-0013', `Index target: ${indexName}.${storeKey}, does not exist in the Store`)
        }      
    }

    static isIterable = (obj: any) => {
        return ! _.isUndefined(obj) && typeof obj[Symbol.iterator] === 'function';
    }

    next(): IteratorResult<any> {
        let done    = false 
        let value   = undefined
        let idx     = 0 
        // Go past any deleted entries
        do {
            if ( this.indexCounter >= this.storeIndexEntries!.length ) {
                done  = true
                value = undefined
            }
            else {
                let storeId = this.storeIndexEntries[this.indexCounter++ ]
                if ( ! _.isUndefined( storeId ) && store.hasStoreId(this.storeKey, storeId)) {
                    value = done ? undefined : store.get( this.storeKey, storeId ) as T
                }
            }
        } while ( !done && _.isUndefined( value ) ) // Go past deleted entries

        return { value: [ idx++ , value] , done: done }
    }

    /*
    static getEntries( value: any ) : IterableIterator<any> {
        try {
            if ( this.isIterable(value))
                return (value as unknown as any )!.entries() as IterableIterator<any>
            else
                throw new CxError(__filename, 'StoreIterator.getEntries()', 'STORE-0014', `Object is not iterable`,)
        }
        catch ( err ) {
            throw new CxError(__filename, 'StoreIterator.getEntries()', 'STORE-0015', `Cannot return iterable entries due to: ${err}`, err)
        }
    }
    */

    reset() {
        this.indexCounter = 0
    }
}