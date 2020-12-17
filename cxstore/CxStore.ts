import { StoreIntf, StateMetaData } from "./interfaces.ts"
import { ActionDescriptor, ActionDescriptorFactory } from "../cxctrl/ActionDescriptor.ts"
import { StateKeys } from "../cxctrl/interfaces.ts"
import { storeIdSeq } from "./generators.ts"
import cloneDeep    from "https://raw.githubusercontent.com/lodash/lodash/master/cloneDeep.js"
import clone        from "https://raw.githubusercontent.com/lodash/lodash/master/clone.js"
import isObject     from "https://raw.githubusercontent.com/lodash/lodash/master/isObject.js"
import isUndefined  from "https://raw.githubusercontent.com/lodash/lodash/master/isUndefined.js"
import isEqual      from "https://raw.githubusercontent.com/lodash/lodash/master/eqDeep.js"
import { Mutex, $log, ee } from "../cxutil/mod.ts"

export class CxStore {
    /**
     * Cxstore class implementing the StoreIntf
     * TODO: for later - update the Store to support shared memory and workers
     */ 
    state           = new Map<string, Map<number, any>>()
    index           = new Map<number, Map<string, any>>()
    meta            = new Map<string, StateMetaData>()
    updIdx: number  = 0
    config          = new Map<string,any>()

    /**
     * Register saves a deep copy of an object to the Store (register is a synonym for the set function)
     * @template T The type of the object
     * @param key The store name of the object
     * @param objRef A reference to the object to be stored
     * @param threshold The number of entries in the immutable collection to keep ( less than 2 for unlimited, otherwise the number given )
     * @returns The storeId of the object 
     */
    async register<T> (
        key: string, 
        objRef: T & StateKeys, 
        threshold: number = -1, 
        actiondesc: ActionDescriptor | undefined = undefined
        ): Promise<number> 
        {       

            return this.set( key, objRef , threshold, actiondesc )
        } 

    setThreshold( key: string, _threshold: number ) : number {
        let threshold = _threshold < 2 ? -1 : _threshold
        if ( ! this.meta.has(key) ) 
            throw Error(`setThreshold() cannot find meta data on the store object named: ${key}`)

        this.meta.get(key)!.threshold = threshold
        return threshold
    }

    async unregister (key: string): Promise<boolean> {
        if ( this.state.has(key) ) { 
            await Mutex.doAtomic( key, async () => {
                    // console.debug('GOT latch')
                    this.state.delete(key)
                    this.meta.delete(key)
                }) 
        }
        else throw Error(`unregister() cannot find a store object named: ${key}`)

        return Promise.resolve(true)
    }

    /**
     * Gets size , the number of entries, in the whole store
     * 
     * @return number
     */
    size(): number { return this.state.size }

    /**
     * Determines whether store object exists 
     * 
     * @param key The name of the stored object
     * @param storeid  The id of the stored object
     * @return boolean
     */
    hasStoreId (key: string, storeId:number): boolean {
            return ( this.state.has( key ) && this.state.get(key)!.has(storeId) )
        }

    /**
     * Determines whether index object exists for a given jobId
     * 
     * @param key The name of the indexed object
     * @param jobId  The jobId of the indexed object
     * @return boolean
     */
    hasIndexId (key: string, jobId:number ): boolean {
        return ( this.index.has(jobId) && this.index.get(jobId)!.has(key) )
    }

    getJobStoreId( key: string, jobId:number ) : number {
        return this.hasIndexId( key, jobId ) ? this.index.get(jobId)!.get(key) : this.getStoreId(key)
    }

    /**
     * Determines whether index object exists for a given jobId
     * 
     * @param key The name of the indexed object
     * @param jobId  The jobId of the indexed object
     * @return boolean
     */
    getChildState<S>(key: string, jobId:number ): S | undefined {
        return this.hasIndexId(key, jobId) ? this.index.get(jobId)!.get(key): undefined
    }

    /**
     * Get store id of cx store
     * 
     * @param key The name of the stored object
     * @param storeId The number of the version to retrieve, -1 defaulting to the most recent one
     * @return The storeId index
     */
    getStoreId( key: string, storeId: number = -1 ) : number {
            let idx = storeId
            if ( this.isRegistered(key) ) { 
                // console.log(`META Before getStoreId -> Key: ${key}, stateRef: ${JSON.stringify(meta.get(key))}`)
                idx = this.meta.get(key)!.storeId
                if ( storeId > -1 ) {
                    if ( this.hasStoreId( key, storeId ) ) 
                        idx = storeId
                    else 
                        idx = -1
                }
            }
            else throw new Error (`store.getStoreId(): ${key} does not exist`)
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
    get<T>( key: string, _storeId:number = -1, getRefOnly: boolean = false ):  T & StateKeys {
            let storeId = this.getStoreId( key, _storeId )
            // if ( getRefOnly )
            return this.state.get(key)!.get(storeId) as  T & StateKeys
            // else 
            //    return cloneDeep( this.state.get(key)!.get(storeId) ) as T & StateKeys
        }

    /**
     * Get reference to a store object (use with care )
     * 
     * @param key The name of the store object 
     * @returns A reference to the stored object

     NOT needed seince we do freeze --> getRef<T>( key: string, _idx: number = -1 ): T & StateKeys{ return this.get( key, _idx, true) as  T & StateKeys }
    */

    /**
     * Saves a deep copy of an object to the Store
     * @template S The type of the object
     * @param key The store name of the object
     * @param objRef A reference to the object to be stored
     * @param threshold The number of entries in the immutable collection to keep ( less than 2 for unlimited, otherwise the number given )
     * @returns The storeId of the object 
     */
    async set<S>( key: string, objRef: S & StateKeys, threshold: number = -1, _actionDesc: ActionDescriptor | undefined  ): Promise<number>  {

            if (  isUndefined( key) ) throw new Error ( "Store.set() must be passed a valid Object key-name to store")     
            if ( !isObject( objRef) ) throw new Error ( "Store.set() must be passed an Object to store")
            //
            // If the ActionDescriptor is not initialized ( that is if this was called directly ) then initialize
            // 
            let actionDesc: ActionDescriptor = _actionDesc === undefined ? ActionDescriptorFactory(key): _actionDesc

            //
            // Do we have a new key? If so we create the meta info
            //
            if ( !this.state.has( key ) )  {
                let thresholdSize = threshold < 2 ? -1 : threshold
                // console.log(`Initilize meta for: ${key} with cue to check state.has(${key})`)
                this.meta.set( key, { storeId: -1, prevStoreId: -1, prevJobId: -1 , prevTaskId: -1, threshold: thresholdSize } as StateMetaData )
                this.state.set( key, new Map<number,any>() ) 
            }

            if ( ! this.index.has( actionDesc.jobId ) ) { this.index.set( actionDesc.jobId , new Map<string,any>() ) }   
            //
            // Now prepare to insert the object
            // 
            let metaInfo = this.meta.get(key)!     
            
            let newMetaInfo: StateMetaData = { 
                storeId:     storeIdSeq().next().value as number, 
                prevStoreId: metaInfo.storeId, 
                prevJobId:   actionDesc.jobId , 
                prevTaskId:  actionDesc.taskId, 
                threshold:   metaInfo.threshold
            } 

            let lock     = `${key}_write`
            await Mutex.doAtomic( lock, async () => {
                //
                // Build and Store the data
                //
                // update the calling objRef with the new keys
                //
                objRef.jobId   = actionDesc.jobId
                objRef.taskId  = actionDesc.taskId
                let objClone: any = Object.freeze( cloneDeep( objRef ) )
                try {       
                    //
                    // Store the cloned data
                    //
                    this.state.get(key)!.set( newMetaInfo.storeId , objClone )
                    //
                    // store the job-index reference
                    //
                    this.index.get(actionDesc.jobId)!.set(key, objClone ) 
                    //
                    // set the updated metaData
                    //
                    this.meta.set( key, newMetaInfo )
                    //
                    // Delete expired records, if we have a thresshold
                    // TODO: change this to consider jobId to insure a consident view over multiple objects
                    // 
                    if ( metaInfo.threshold > 1 && this.state.get(key)!.size > metaInfo.threshold ) {
                        let firstKey  = this.state.get(key)!.keys().next().value
                        this.state.get(key)!.delete(firstKey)
                    }
                }
                catch(err) {
                    //
                    // Roll back the objRef update
                    //
                    objRef.jobId   = newMetaInfo.prevJobId
                    objRef.taskId  = newMetaInfo.prevTaskId
                    throw new Error ( `Store.set() failed to store data for ${key}`) 
                }
            }) 
            return Promise.resolve(newMetaInfo.storeId)
        }

    /**
     * Is the object key/name exists in the store?
     * 
     * @param key The store name of the object
     * @return boolean
     */
    has(key: string): boolean { return this.isRegistered( key ) }

    /**
     * Is the named object reistred in the store and does it have an entry?
     * 
     * @param key The store name of the object
     * @return boolean
     */
    isRegistered(key: string): boolean { return ( this.state.has(key) && this.state.get(key)!.size > 0  ) }

    /**
     * Get a reference to the whole store map
     */
    getState(): ReadonlyMap<string, {}> { return this.state }
        
    /**
     * Get a reference to the whole metadata map
     */
    getMeta(): ReadonlyMap<string, {}> { return this.meta }

}