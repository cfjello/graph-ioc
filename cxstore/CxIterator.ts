import  Mutex  from "https://deno.land/x/await_mutex@v1.0.1/mod.ts"
import { ctrl, Action} from "../cxctrl/mod.ts"
import { _ , CxError} from "../cxutil/mod.ts"
import { IteratorType, AsyncIterator } from "./interfaces.ts"

const __filename = new URL('', import.meta.url).pathname;

export class CxIterator<T,E = unknown> implements Iterator<T|E>{
    // mutex             = new Mutex();
    storeIndexList:      Array<number>
    currEntries?:        Iterator<any>
    indexKey: string
    indexCounter: number  = 0
    entryCounter  = 0
    allDone       = false
    
    constructor( public config: Partial<IteratorType> ) {    
       try {
            config.indexPrefix     = config.indexPrefix ?? 'J'
            this.indexKey          = typeof config.indexKey === 'string' ? config.indexKey : `${config.indexPrefix}${config.indexKey}`
            this.indexCounter      = config.indexOffset ?? 0
            config.nestedIterator  = config.nestedIterator ?? false
            this.storeIndexList = ctrl.store.index.get(this.indexKey)!.get(config.storeKey!)!
       }
       catch(err) {
            throw new CxError(__filename, 'CxIterator.constructor()', 'STORE-0013', `Iterator indexKey: ${config.indexKey} or target: ${config.storeKey} failed`, err)
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
            if ( this.config.nestedIterator ?? false )
                return this.nextInEntry() as IteratorResult<E> 
            else
                return this.nextInStore() as IteratorResult<T>
        }
        catch (err) {
            throw new CxError(__filename, 'CxIterator.next()', 'STORE-0021', `Cannot return next entry.`, err)
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
            if ( this.indexCounter >= this.storeIndexList!.length) {
                done  = true
                value = undefined
            }
            else {
                //
                // get next entry
                //
                // deno-lint-ignore prefer-as-const
                let storeId = this.storeIndexList[this.indexCounter++ ]
                if ( ! _.isUndefined( storeId ) && ctrl.store.hasStoreId(this.config.storeKey!, storeId)) {
                    value = done ? undefined : ctrl.store.get( this.config.storeKey!, storeId ) as T
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
            throw new CxError(__filename, 'CxIterator.nextInEntry()', 'STORE-0016', `Cannot return item from iterable store entry.`, err)
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
    
    constructor( public config: Partial<IteratorType> ) {    
       try {
            config.indexPrefix     = config.indexPrefix ?? 'J'
            this.indexCounter      = config.indexOffset ?? 0
            config.nestedIterator  = config.nestedIterator ?? false
            let noJobId            = (typeof config.indexKey === 'string' && config.indexKey  === '-1') || config.indexKey  === -1
            this.indexKey          = typeof config.indexKey === 'string' ? config.indexKey : `${config.indexPrefix}${config.indexKey}`
            this.actionObj         = ctrl.actions.get(this.config.storeKey!)! 
            if ( ! noJobId ) {
                this.setStoreIndexList( this.indexKey!, config.storeKey! )
            }
        }
       catch(err) {
            throw new CxError(__filename, 'CxContinuous.constructor()', 'STORE-0017', `Iterator indexKey: ${config.indexKey} or target: ${config.storeKey} failed`, err)
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
                this.setStoreIndexList( this.indexKey, this.config.storeKey as string )
                this.indexCounter = 0
            }
        }
        catch(err) {
            throw new CxError(__filename, 'CxContinuous.nextInStore()', 'STORE-0018', `Failed to run: ${this.config.storeKey!}`, err)
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
            if ( this.config.nestedIterator ?? false ) 
                return await this.nextInEntry() as IteratorResult<E>    
            else 
                return await this.nextInStore() as IteratorResult<T>  
        }
        catch(err) {
            throw new CxError(__filename, 'CxContinuous.next()', 'STORE-0021', `Cannot retrieve next value.}`, err)
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
                let storeId = ctrl.store.getStoreId(this.config.storeKey as string, -1)
                if ( storeId > -1 ) { //  The object has published something                       
                    this.indexKey = `${this.config.indexPrefix}${this.actionObj.getJobId()}`
                    this.setStoreIndexList( this.indexKey, this.config.storeKey! )
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
                if ( ! _.isUndefined( storeId ) && ctrl.store.hasStoreId(this.config.storeKey!, storeId)) {
                    value = done ? undefined : ctrl.store.get( this.config.storeKey!, storeId ) as T
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
            throw new CxError(__filename, 'CxContinuous.getEntries()', 'STORE-0019', `Cannot return iterable entries.}`, err)
        }
    }

    async nextInEntry(): Promise<IteratorResult<E>> { 
        let nextInStore: IteratorResult<any>
        try {
            //
            // Initial condition
            //
            if ( _.isUndefined( this.currEntries ) ) {
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
            throw new CxError(__filename, 'CxContinuous.nextInEntry()', 'STORE-0020', `Cannot return item from iterable store entry.`, err)
        }
    }

    reset( indexCounter: number = 0) {
        this.indexCounter = indexCounter
        this.entryCounter = 0
        this.currEntries = undefined
    }
}