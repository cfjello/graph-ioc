import  Mutex  from "https://deno.land/x/await_mutex@v1.0.1/mod.ts"
import { ctrl, Action} from "../cxctrl/mod.ts"
import { _ , CxError} from "../cxutil/mod.ts"
import { IteratorType, AsyncIterator } from "./interfaces.ts"

const __filename = new URL('', import.meta.url).pathname;

export class CxIterator<T,E = unknown> implements Iterator<T|E>{
    // mutex             = new Mutex();
    storeIndexList:      Array<number> = []
    currEntries?:        Iterator<any>
    indexKey: string
    indexCounter: number  = 0
    entryCounter  = 0
    allDone       = false
    
    constructor( public conf: Partial<IteratorType> ) {    
       try {
            conf.indexPrefix     = conf.indexPrefix ?? 'J'
            this.indexKey        = typeof conf.indexKey === 'string' ? conf.indexKey : `${conf.indexPrefix}${conf.indexKey}`
            this.indexCounter    = conf.indexOffset ?? 0
            conf.nestedIterator  = conf.nestedIterator ?? false
            if ( ctrl.store.index.has(this.indexKey) ) {
                this.storeIndexList  = ctrl.store.index.get(this.indexKey)!.get(conf.storeKey!)!
            }
       }
       catch(err) {
            throw new CxError(__filename, 'CxIterator.constructor()', 'STORE-0013', `Iterator indexKey: ${conf.indexKey} or target: ${conf.storeKey} failed`, err)
       }
    }

    static isIterable = (obj: any) => {
        return ! _.isUndefined(obj) && typeof obj[Symbol.iterator] === 'function';
    }

    next(caller: any = undefined ): IteratorResult<T> | IteratorResult<E> { 
        try {
            if ( caller !== undefined && ! (caller as Action<any>).swarm?.canRun ) {
                //
                // This provides runtime control for swarm-objects 
                // 
                return { value: [ 0 , undefined ] , done: true }  as IteratorResult<T>
            }
            //
            // The default behavior
            //
            if ( this.conf.nestedIterator ?? false )
                return this.nextInEntry() as IteratorResult<E> 
            else
                return this.nextInStore() as IteratorResult<T>
        }
        catch (err) {
            throw new CxError(__filename, 'CxIterator.next()', 'ITOR-0010', `Cannot return next entry.`, err)
        }
    }

    nextInStore(): IteratorResult<T> {
        let done    = false 
        let value   = undefined
        let idx     = 0 
        // Go past any deleted entries
        do {
            //
            // Check for 'done', no more entries
            // 
            if ( this.storeIndexList!.length === 0 ) {
                
            }
            if ( this.indexCounter > 0 && this.indexCounter >= this.storeIndexList!.length) {
                done  = true
                value = undefined
            }
            else {
                //
                // get next entry
                //
                // deno-lint-ignore prefer-as-const
                let storeId = this.storeIndexList[this.indexCounter++ ]
                if ( ! _.isUndefined( storeId ) && ctrl.store.hasStoreId(this.conf.storeKey!, storeId)) {
                    value = done ? undefined : ctrl.store.get( this.conf.storeKey!, storeId ) as T
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
            throw new CxError(__filename, 'CxIterator.getEntries()', 'ITOR-0011', `Cannot return iterable entries due to: ${err}`, err)
        }
    }

    nextInEntry(): IteratorResult<E> { 
        // deno-lint-ignore no-explicit-any
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

            // deno-lint-ignore no-explicit-any
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
            throw new CxError(__filename, 'CxIterator.nextInEntry()',  "ITOR-0012", `Cannot return item from iterable store entry.`, err)
        }
    }

    reset( indexCounter: number = 0) {
        this.indexCounter = indexCounter
        this.entryCounter = 0
        this.currEntries = undefined
    }
}

export class CxContinuous<T,E  = unknown> implements AsyncIterator<T|E>{
    mutex                         = new Mutex();
    actionObj:      Action<T>
    storeIndexList: Array<number> = []
    currEntries?:   Iterator<any>
    indexKey:       string
    indexCounter:   number        = 0
    entryCounter:   number        = 0
    allDone:        boolean       = false
    
    constructor( public conf: Partial<IteratorType> ) {    
       try {
            conf.indexPrefix     = conf.indexPrefix ?? 'J'
            this.indexCounter      = conf.indexOffset ?? 0
            conf.nestedIterator  = conf.nestedIterator ?? false
            let noJobId            = (typeof conf.indexKey === 'string' && conf.indexKey  === '-1') || conf.indexKey  === -1
            this.indexKey          = typeof conf.indexKey === 'string' ? conf.indexKey : `${conf.indexPrefix}${conf.indexKey}`
            this.actionObj         = ctrl.actions.get(this.conf.storeKey!)! 
            if ( ! noJobId ) {
                this.setStoreIndexList( this.indexKey!, conf.storeKey! )
            }
        }
       catch(err) {
            throw new CxError(__filename, 'CxContinuous.constructor()',  "ITOR-0013", `Iterator indexKey: ${conf.indexKey} or target: ${conf.storeKey} failed`, err)
       }
    }

    static isIterable = (obj: any) => {
        return ! _.isUndefined(obj) && typeof obj[Symbol.iterator] === 'function';
    }

    setStoreIndexList( indexKey: string, storeKey: string ): void {
        this.storeIndexList = ctrl.store.index.get(indexKey)?.get(storeKey as string)!
    }

    async getNextObjValues() {
        try {     
            let preStoreId = ctrl.store.getStoreId(this.actionObj.meta.name as string, -1)
            await this.actionObj.run(true)
            let postStoreId = ctrl.store.getStoreId(this.actionObj.meta.name as string, -1)
            //
            // Check if we published something new
            //
            if ( preStoreId === postStoreId ) {
                this.allDone = true
            }
            else {
                this.indexKey = 'J' + this.actionObj.getJobId()
                this.setStoreIndexList( this.indexKey, this.conf.storeKey as string )
                this.indexCounter = 0
            }
        }
        catch(err) {
            throw new CxError(__filename, 'CxContinuous.nextInStore()',  "ITOR-0014", `Failed to run: ${this.conf.storeKey!}`, err)
        } 
        
    }

    async next( caller: any = undefined ): Promise<IteratorResult<T> | IteratorResult<E>> {
        const nextMutex = await this.mutex.acquire()
        try {
            if ( caller !== undefined && ! (caller as Action<any>).swarm.canRun ) {
                //
                // This provides runtime control for swarm-objects 
                // 
                return { value: [ 0 , undefined ] , done: true }  as IteratorResult<T>
            }
            //
            // The default behavior
            //
            if ( this.conf.nestedIterator ?? false ) 
                return await this.nextInEntry() as IteratorResult<E>    
            else 
                return await this.nextInStore() as IteratorResult<T>  
        }
        catch(err) {
            throw new CxError(__filename, 'CxContinuous.next()',  "ITOR-0015", `Cannot retrieve next value.}`, err)
        }
        finally {
             this.mutex.release(nextMutex)
        }
    }

    async nextInStore(): Promise<IteratorResult<T>> {
        let done        = false 
        let value       = undefined
        let idx         = 0 
        // Go past any deleted entries
        do {
            //  If have read beyond the last storeId and need to fetch more - this can succeed and reach EOF
            let noStoreIndex = _.isUndefined(this.storeIndexList)
            let noIndexEntries = ( ! noStoreIndex && this.indexCounter >= (this.storeIndexList ?? []).length )

            if ( ! this.allDone && this.entryCounter === 0 ) {
                //
                // Initially check, if the storeKey object has already published something
                // If so, initialize the Iterator
                // 
                let storeId = ctrl.store.getStoreId(this.conf.storeKey as string, -1)
                if ( storeId > -1 ) { //  The object has published something                       
                    this.indexKey = `${this.conf.indexPrefix}${this.actionObj.getJobId()}`
                    this.setStoreIndexList( this.indexKey, this.conf.storeKey! )
                    noStoreIndex   = false
                    noIndexEntries = ( ! noStoreIndex && this.indexCounter >= (this.storeIndexList ?? []).length )
                }
            } 
            if ( ! this.allDone && ( noStoreIndex || noIndexEntries ) ) { 
                // 
                // If no more entries, then call run() on the storeKey item to try to get a next set of values published
                // 
                await this.getNextObjValues()
            }
            //
            // Check for 'done', no more entries
            // 
            if ( this.allDone || this.indexCounter >= (this.storeIndexList ?? []).length ) {
                done  = true
                value = undefined
            }
            else {
                //
                // get next entry
                //
                let storeId = this.storeIndexList[this.indexCounter++ ]
                if ( ! _.isUndefined( storeId ) && ctrl.store.hasStoreId(this.conf.storeKey!, storeId)) {
                    value = done ? undefined : ctrl.store.get( this.conf.storeKey!, storeId ) as T
                }
            }
        } while ( !done && _.isUndefined( value ) ) // Go past any deleted entries

        let result: IteratorResult<T> = { value: [ idx++ , value as T] , done: done }  as IteratorResult<T>
        return Promise.resolve( result )
    }

    static getEntries<E>( _value: Iterable<any> | IteratorResult<any> | any ): IterableIterator<E> | undefined {
        try {
            let value = _.isUndefined( _value.value ) ? _value : _value.value[1]
            if ( CxContinuous.isIterable(value) ) {
                return (value)!.entries() as IterableIterator<E>
            }
            else
                return undefined
        }
        catch ( err ) {
            throw new CxError(__filename, 'CxContinuous.getEntries()',  "ITOR-0016", `Cannot return iterable entries.}`, err)
        }
    }

    async nextInEntry(): Promise<IteratorResult<E>> { 
        let nextInStore: IteratorResult<any>
        try {
            //
            // Initial condition
            //
            if ( _.isUndefined( this.currEntries) ) {
                nextInStore = await this.nextInStore()
                if ( ! nextInStore.done ) {
                    this.currEntries = CxContinuous.getEntries( (nextInStore.value)[1] ) 
                }
                else {
                    this.allDone = true
                }
            }

            let nextEntry = { value: undefined, done: true} as IteratorResult<any>
            
            if ( ! this.allDone ) {
                nextEntry = this.currEntries!.next() 
                //
                // Switch to next store Object Condition
                //
                if ( nextEntry.done ) {
                    nextInStore = await this.nextInStore()               
                    if ( ! nextInStore.done ) {
                        this.currEntries = CxContinuous.getEntries( nextInStore.value[1])
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
            return Promise.resolve( nextEntry as IteratorResult<E> ) 
        }
        catch ( err ) {
            throw new CxError(__filename, 'CxContinuous.nextInEntry()',  "ITOR-0017", `Cannot return item from iterable store entry.`, err)
        }
    }

    reset( indexCounter: number = 0) {
        this.indexCounter = indexCounter
        this.entryCounter = 0
        this.currEntries = undefined
    }
}