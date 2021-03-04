import { ctrl } from "../cxctrl/mod.ts"
import { _ , CxError} from "../cxutil/mod.ts"

const __filename = new URL('', import.meta.url).pathname;

export class CxIterator<T,E = unknown> implements Iterator<T|E>{
    storeIndexEntries!:  Array<number>
    currEntries?:        Iterator<any>
    indexKey: string
    entryCounter:        number  = 0
    allDone:             boolean = false
    
    constructor(
        public storeKey: string, 
        public indexKeyId: number | string, 
        public inObjectIterator: boolean = false, 
        public indexCounter: number = 0, 
        prefix: string = 'J' 
        ) {
            this.indexKey = typeof indexKeyId === 'string' ? indexKeyId : `${prefix}${indexKeyId}`
            let hasIndexKey = ctrl.store.index.has(this.indexKey)
            if ( hasIndexKey && ctrl.store.index.get(this.indexKey)!.has(storeKey) ) {
                this.storeIndexEntries = ctrl.store.index.get(this.indexKey)!.get(storeKey)! 
            }
            else {
                throw new CxError(__filename, 'CxIterator.constructor()', 'STORE-0013', `Index target: ${this.indexKey}.${storeKey}, does not exist in the Store`)
        }      
    }

    static isIterable = (obj: any) => {
        return ! _.isUndefined(obj) && typeof obj[Symbol.iterator] === 'function';
    }

    next(): IteratorResult<T> | IteratorResult<E> {
        if ( this.inObjectIterator ) {
            return this.nextInEntry() as IteratorResult<E> 
        }
        else {
            return this.nextInStore() as IteratorResult<T>
        }
    }

    nextInStore(): IteratorResult<T> {
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
                if ( ! _.isUndefined( storeId ) && ctrl.store.hasStoreId(this.storeKey, storeId)) {
                    value = done ? undefined : ctrl.store.get( this.storeKey, storeId ) as T
                }
            }
        } while ( !done && _.isUndefined( value ) ) // Go past any deleted entries

        return { value: [ idx++ , value as T] , done: done } as IteratorResult<T>
    }

    static getEntries<E>( _value: Iterable<any> | IteratorResult<any> | any ): IterableIterator<E> | undefined {
        try {
            let value = _.isUndefined( _value.value ) ? _value : _value.value[1]
            if ( this.isIterable(value) )
                return (value)!.entries() as IterableIterator<E>
            else
                return undefined
        }
        catch ( err ) {
            throw new CxError(__filename, 'CxIterator.getEntries()', 'STORE-0015', `Cannot return iterable entries due to: ${err}`, err)
        }
    }

    nextInEntry(): IteratorResult<E> { 
        let nextInStore: IteratorResult<any>
        try {
            //
            // Initial condition
            //
            if ( _.isUndefined( this.currEntries ) ) {
                nextInStore = this.nextInStore()
                if ( ! nextInStore.done ) {
                    this.currEntries = CxIterator.getEntries( (nextInStore.value)[1] ) 
                }
            }

            let nextEntry = { value: undefined, done: true} as IteratorResult<any>
            
            if ( ! this.allDone ) {
                nextEntry = this.currEntries!.next() 
                //
                // Switch to next store Object Condition
                //
                if ( nextEntry.done ) {
                    nextInStore = this.nextInStore()               
                    if ( ! nextInStore.done ) {
                        this.currEntries = CxIterator.getEntries( nextInStore.value[1])
                        nextEntry = this.currEntries!.next() 
                    }
                    else {
                        this.allDone = true
                    }
                }

                //
                // Provide continuous index
                //
                if ( ! this.allDone && ! nextEntry.done ) nextEntry.value[0] = this.entryCounter++
            }
           return nextEntry as IteratorResult<E>
        }
        catch ( err ) {
            throw new CxError(__filename, 'CxIterator.nextInEntry()', 'STORE-0016', `Cannot return item from iterable store entry.`, err)
        }
    }

    reset( indexCounter: number = 0) {
        this.indexCounter = indexCounter
        this.entryCounter = 0
        this.currEntries = undefined
    }
}