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
// import { Mutex }    from "../cxutil/Mutex.ts"
// import { $log }     from "../cxutil/CxLog.ts"



/**
 * Cxstore class implementing the StoreIntf
 * TODO: for later - update the Store to support shared memory and workers
 */ 
let state           = new Map<string, Map<number, any>>()
let index           = new Map<number, Map<string, any>>()
let meta            = new Map<string, StateMetaData>()
let updIdx: number  = 0
// let storeId         = storeIdSeq();
let config          = new Map<string,any>()

/**
 * Register saves a deep copy of an object to the Store (register is a synonym for the set function)
 * @template T The type of the object
 * @param key The store name of the object
 * @param objRef A reference to the object to be stored
 * @param threshold The number of entries in the immutable collection to keep ( less than 2 for unlimited, otherwise the number given )
 * @returns The storeId of the object 
 */
export async function register<T> (
    key: string, 
    objRef: T & StateKeys, 
    threshold: number = -1, 
    actiondesc: ActionDescriptor | undefined = undefined
    ): Promise<number> 
    {       

        return set( key, objRef , threshold, actiondesc )
    } 

export function setThreshold( key: string, _threshold: number ) : number {
    let threshold = _threshold < 2 ? -1 : _threshold
    if ( ! meta.has(key) ) 
        throw Error(`setThreshold() cannot find meta data on the store object named: ${key}`)

    meta.get(key)!.threshold = threshold
    return threshold
}

export async function unregister (key: string): Promise<boolean> {
    if ( state.has(key) ) { 
        await Mutex.doAtomic( key, async () => {
                // console.debug('GOT latch')
                state.delete(key)
                meta.delete(key)
            }) 
    }
    else throw Error(`unregister() cannot find a store object named: ${key}`)

    return Promise.resolve(true)
}

/**
 * Gets size , the number of entries, in the store
 * 
 * @return number
 */
export function size(): number { return state.size }

/**
 * Determines whether store object exists 
 * 
 * @param key The name of the stored object
 * @param storeid  The id of the stored object
 * @return boolean
 */
export function hasStoreId (key: string, storeId:number): boolean {
        return ( state.has( key ) && state.get(key)!.has(storeId) )
    }

/**
 * Determines whether index object exists for a given jobId
 * 
 * @param key The name of the indexed object
 * @param jobId  The jobId of the indexed object
 * @return boolean
 */
export function hasIndexId (key: string, jobId:number ): boolean {
    return ( index.has(jobId) && index.get(jobId)!.has(key) )
}

export function getJobStoreId( key: string, jobId:number ) : number {
    return hasIndexId( key, jobId ) ? index.get(jobId)!.get(key) : getStoreId(key)
}

/**
 * Determines whether index object exists for a given jobId
 * 
 * @param key The name of the indexed object
 * @param jobId  The jobId of the indexed object
 * @return boolean
 */
export function getChildState<S>(key: string, jobId:number ): S | undefined {
    return hasIndexId(key, jobId) ? index.get(jobId)!.get(key): undefined
}

/**
 * Get store id of cx store
 * 
 * @param key The name of the stored object
 * @param storeId The number of the version to retrieve, -1 defaulting to the most recent one
 * @return The storeId index
 */
export function getStoreId( key: string, storeId: number = -1 ) : number {
        let idx = storeId
        if ( isRegistered(key) ) { 
            // console.log(`META Before getStoreId -> Key: ${key}, stateRef: ${JSON.stringify(meta.get(key))}`)
            idx = meta.get(key)!.storeId
            if ( storeId > -1 ) {
                if ( hasStoreId( key, storeId ) ) 
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
export function get<T>( key: string, _storeId:number = -1, getRefOnly: boolean = false ):  T & StateKeys {
        let storeId = getStoreId( key, _storeId )
        if ( getRefOnly )
            return state.get(key)!.get(storeId) as  T & StateKeys
        else 
            return cloneDeep( state.get(key)!.get(storeId) ) as T & StateKeys
    }

/**
 * Get reference to a store object (use with care )
 * 
 * @param key The name of the store object 
 * @returns A reference to the stored object
 */
export function getRef<T>( key: string, _idx: number = -1 ): T & StateKeys{ return get( key, _idx, true) as  T & StateKeys }

/**
 * Saves a deep copy of an object to the Store
 * @template S The type of the object
 * @param key The store name of the object
 * @param objRef A reference to the object to be stored
 * @param threshold The number of entries in the immutable collection to keep ( less than 2 for unlimited, otherwise the number given )
 * @returns The storeId of the object 
 */
export async function set<S>( key: string, objRef: S & StateKeys, threshold: number = -1, _actionDesc: ActionDescriptor | undefined  ): Promise<number>  {

        if (  isUndefined( key) ) throw new Error ( "Store.set() must be passed a valid Object key-name to store")     
        if ( !isObject( objRef) ) throw new Error ( "Store.set() must be passed an Object to store")
        //
        // If the ActionDescriptor is not initialized ( that is if this was called directly ) then initialize
        // 
        let actionDesc: ActionDescriptor = _actionDesc === undefined ? ActionDescriptorFactory(key): _actionDesc

        //
        // Do we have a new key? If so we create the meta info
        //
        if ( !state.has( key ) )  {
            let thresholdSize = threshold < 2 ? -1 : threshold
            // console.log(`Initilize meta for: ${key} with cue to check state.has(${key})`)
            meta.set( key, { storeId: -1, prevStoreId: -1, prevJobId: -1 , prevTaskId: -1, threshold: thresholdSize } as StateMetaData )
            state.set( key, new Map<number,any>() ) 
        }

        if ( ! index.has( actionDesc.jobId ) ) { index.set( actionDesc.jobId , new Map<string,any>() ) }   

        //
        // Now prepare to insert the object
        // 
        let metaInfo = meta.get(key)!     
        
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
                state.get(key)!.set( newMetaInfo.storeId , objClone )
                //
                // store the job-index reference
                //
                index.get(actionDesc.jobId)!.set(key, objClone ) 
                //
                // set the updated metaData
                //
                meta.set( key, newMetaInfo )
                //
                // Delete expired records, if we have a thresshold
                //
                if ( metaInfo.threshold > 1 && state.get(key)!.size > metaInfo.threshold ) {
                    let firstKey  = state.get(key)!.keys().next().value
                    state.get(key)!.delete(firstKey)
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
export function has(key: string): boolean { return isRegistered( key ) }

/**
 * Is the named object reistred in the store and does it have an entry?
 * 
 * @param key The store name of the object
 * @return boolean
 */
export function isRegistered(key: string): boolean { return ( state.has(key) && state.get(key)!.size > 0  ) }

/**
 * Get a reference to the whole store map
 */
export function getState(): ReadonlyMap<string, {}> { return state }
    
/**
 * Get a reference to the whole metadata map
 */
export function getMeta(): ReadonlyMap<string, {}> { return meta }