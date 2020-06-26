import {StoreIntf, stateMetaData} from "./interfaces.ts"
import _ from "https://deno.land/x/deno_lodash/mod.ts"
import { Mutex } from "https://raw.githubusercontent.com/mauvexephos/mutex/master/mod.ts"
import { equal } from "https://deno.land/std/testing/asserts.ts"

/**
 * Latchs sequence generator for internal locking
 */
let latSeq: number = 0
function* latchSeq() {
    while(true) {
        yield latSeq++;
    }
}

/**
 * Store sequence generator for internal numbering of sequences
 */
let stSeq: number = 0
function* storeSeq() {
    while(true) {
        yield stSeq++;
    }
}

/**
 * Cxstore class implementing the StoreIntf
 * TODO: for later - update the Store to support shared memory and workers
 */
export class CxStore implements StoreIntf {  
    private state           = new Map< string, Map<number,any> >()
    private meta            = new Map<string,stateMetaData>()
    private updIdx: number  = 0
    private latchId         = latchSeq();
    private storeId         = storeSeq();
    // private latches: boolean[] = []
    // private mutex           = new Mutex()
    public  config          = new Map<string,any>()

    /**
     * Creates an instance of cx store.
     * @param [$log] Provide a logger function
     */
    constructor( private $log: any = console ) {
        // this.latches[0] = false
    }

     /**
     * Register saves a deep copy of an object to the Store (register is a synonym for the set function)
     * @template T The type of the object
     * @param key The store name of the object
     * @param objRef A reference to the object to be stored
     * @param threshold The number of entries in the immutable collection to keep ( less than 2 for unlimited, otherwise the number given )
     * @returns The storeId of the object 
     */
    async register<T> (key: string, objRef: T, threshold: number = -1 ): Promise<void> { 
        this.set( key, objRef, threshold )
    } 

    async unregister (key: string): Promise<boolean> {
        if ( this.state.has( key ) ) {
            let self = this
            await Mutex.doAtomic( key, async function() {
                try {                 
                    self.state.delete(key)
                    self.meta.delete(key)
                }
                catch (err ) {
                    throw new Error(err)
                }
            })
        }
        return true
    }

    /**
     * Gets size , the number of entries, in the store
     * 
     * @return number
     */
    get size (): number { return this.state.size }

    /**
     * Determines whether store object exists 
     * 
     * @param key The name of the stored object
     * @param storeid  The id of the stored object
     * @return boolean
     */
    hasStoreId = (key: string, storeId:number): boolean => {
        return ( this.state.has( key ) && this.state.get(key)!.has(storeId) )
    }

    /**
     * Get store id of cx store
     * 
     * @param key The name of the stored object
     * @param storeId The number of the version to retrieve, -1 defaulting to the most recent one
     * @return The storeId index
     */
    getStoreId = ( key: string, storeId: number = -1 ) : number => {
        let idx = storeId
        if ( this.isRegistered(key) ) { 
            if ( storeId == -1 )
                idx = this.meta.get(key)!.storeId
            else if ( this.hasStoreId( key, storeId ) )
                idx = storeId
            else
                idx = -1
        }
        else throw new Error (`Store.getStoreId(): ${key} does not exist`)
        return idx
    }

    /**
     * Gets a typed stored object (a deep copy or a reference depending on the parameters provided)
     * @template T The type of the object
     * @param key The name of the store object 
     * @param [_storeId] Can be set to retrieve a specific numbered version of the store object, otherwise the most recent object is returned
     * @param [getRefOnly] If set to true a reference is returned  otherwise a deep copy (the default)
     * @returns A typed deep copy of the stored object or a reference if parameter getRefOnly is set to true, the latter should be retrieved as readonly 
     */
    get<T>( key: string, _storeId:number = -1, getRefOnly: boolean = false ): T {
        let storeId = this.getStoreId( key, _storeId )
        if ( getRefOnly )
            return this.state.get(key)!.get(storeId) as T
        else 
            return _.cloneDeep( this.state.get(key)!.get(storeId) ) as T
    }

    /**
     * Get reference to a store object (use with care )
     * 
     * @param key The name of the store object 
     * @returns A reference to the stored object
     */
    private getRef = ( key: string, _idx: number = -1 ): {} => this.get( key, _idx, true)

    /**
     * Saves a deep copy of an object to the Store
     * @template T The type of the object
     * @param key The store name of the object
     * @param objRef A reference to the object to be stored
     * @param threshold The number of entries in the immutable collection to keep ( less than 2 for unlimited, otherwise the number given )
     * @returns The storeId of the object 
     */
    async set<T>( key: string, objRef: T, threshold: number = -1  ): Promise<void>  {
        if ( _.isUndefined( key) ) throw new Error ( "Store.set() must be passed a valid Object key-name to store")
        if ( ! _.isObject( objRef) ) throw new Error ( "Store.set() must be passed an Object to store")
        let self = this

        await Mutex.doAtomic( key, async function() {
            // Do we have a new key?
            if ( ! self.state.has( key ) )  {
                let thresholdSize = threshold < 2 ? -1 : threshold
                self.meta.set( key, { latchId: self.latchId.next().value as number, storeId: -1, prevStoreId: -1, threshold: thresholdSize } )
                self.state.set( key, new Map<number,T>() )
            }
            let metaInfo = self.meta.get(key)!
            
            if ( metaInfo.storeId < 0 ||  ! equal( objRef, self.state.get(key)!.get( metaInfo.storeId ) as T ) ) {
                try {
                    metaInfo.prevStoreId = metaInfo.storeId
                    metaInfo.storeId     = self.storeId.next().value as number
                    self.state.get(key)!.set( metaInfo.storeId , _.cloneDeep(objRef) )
                    if ( metaInfo.threshold > 1 && self.state.get(key)!.size > metaInfo.threshold ) {
                        let firstKey  = self.state.get(key)!.keys().next().value
                        self.state.get(key)!.delete(firstKey)
                    }
                    // this.$log.debug(`REGISTER: ${key}:` + JSON.stringify( this.state.get(key)[this.state.get(key).length - 1 ] ) )
                }
                catch (err ) {
                    throw new Error(err)
                }
            }
        })
        // return new Promise<number>( (resolve) => { resolve( self.meta.get(key)!.storeId ) }) 
        // return Promise.resolve( self.meta.get(key)!.storeId ) 
    }

    /**
     * Is the object key/name exists in the store?
     * 
     * @param key The store name of the object
     * @return boolean
     */
    has = (key: string): boolean => this.isRegistered( key )

    /**
     * Is the named object reistred in the store and does it have an entry?
     * 
     * @param key The store name of the object
     * @return boolean
     */
    isRegistered = (key: string): boolean => ( this.state.has(key) && this.state.get(key)!.size > 0  ) 

    /**
     * Debug function to log the whole show store where logging at debug level

    showStore = (): void => {
        this.$log.debug('____ STORE Structure___') 
        this.$log.debug(JSON.stringify(this.state))
        this.$log.debug('____ STORE Structure END___')
    }
    */
    /**
     * Get a reference to the whole store map
     */
    getState = (): ReadonlyMap<string, {}> => this.state
    
    /**
     * Get a reference to the whole metadata map
     */
    getMeta  = (): ReadonlyMap<string, {}> => this.meta
}