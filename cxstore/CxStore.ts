import {StoreIntf, stateMetaData} from "./interfaces.ts"
import cloneDeep    from "https://raw.githubusercontent.com/lodash/lodash/master/cloneDeep.js"
import clone        from "https://raw.githubusercontent.com/lodash/lodash/master/clone.js"
import isObject     from "https://raw.githubusercontent.com/lodash/lodash/master/isObject.js"
import isUndefined  from "https://raw.githubusercontent.com/lodash/lodash/master/isUndefined.js"
import isEqual      from "https://raw.githubusercontent.com/lodash/lodash/master/eqDeep.js"
// import { equal } from "https://deno.land/std/testing/asserts.ts";
import { Mutex }    from "../cxutil/Mutex.ts"
// import { Mutex } from "https://raw.githubusercontent.com/mauvexephos/mutex/master/mod.ts"
// import { Mutex } from "https://raw.githubusercontent.com/denoland/deno/1b6985ad516e2974b91b63e0acbedf7cdd465c6c/std/async/mutex.ts"
import { $log }     from "../cxutil/CxLog.ts"
// import { latches }  from './mod.ts'

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
let state           = new Map< string, Map<number,any>>()
let index           = new Map<string,Object>()
let meta            = new Map<string,stateMetaData>()
let updIdx: number  = 0
let storeId         = storeSeq();
let  config         = new Map<string,any>()

/**
 * Register saves a deep copy of an object to the Store (register is a synonym for the set function)
 * @template T The type of the object
 * @param key The store name of the object
 * @param objRef A reference to the object to be stored
 * @param threshold The number of entries in the immutable collection to keep ( less than 2 for unlimited, otherwise the number given )
 * @returns The storeId of the object 
 */
export async function register<T> (key: string, objRef: T, threshold: number = -1 ): Promise<number> { 
        return set( key, objRef, threshold )
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
 * Get store id of cx store
 * 
 * @param key The name of the stored object
 * @param storeId The number of the version to retrieve, -1 defaulting to the most recent one
 * @return The storeId index
 */
export function getStoreId( key: string, storeId: number = -1 ) : number {
        let idx = storeId
        if ( isRegistered(key) ) { 
            if ( storeId < 0 )
                idx = meta.get(key)!.storeId
            else if ( hasStoreId( key, storeId ) )
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
export function get<T>( key: string, _storeId:number = -1, getRefOnly: boolean = false ): T {
        let storeId = getStoreId( key, _storeId )
        if ( getRefOnly )
            return state.get(key)!.get(storeId) as T
        else 
            return cloneDeep( state.get(key)!.get(storeId) ) as T
    }

/**
 * Get reference to a store object (use with care )
 * 
 * @param key The name of the store object 
 * @returns A reference to the stored object
 */
export function getRef<T>( key: string, _idx: number = -1 ): T { return get( key, _idx, true) as T }

/**
 * Saves a deep copy of an object to the Store
 * @template T The type of the object
 * @param key The store name of the object
 * @param objRef A reference to the object to be stored
 * @param threshold The number of entries in the immutable collection to keep ( less than 2 for unlimited, otherwise the number given )
 * @returns The storeId of the object 
 */
export async function set<T>( key: string, objRef: T, threshold: number = -1  ): Promise<number>  {
        // console.log(`Key: ${key}, stateRef: ${JSON.stringify(objRef)}`)
        if ( isUndefined( key) ) throw new Error ( "Store.set() must be passed a valid Object key-name to store")
        if ( ! isObject( objRef) ) throw new Error ( "Store.set() must be passed an Object to store")
        //
        // Do we have a new key? If so we create the meta info
        //
        if ( ! state.has( key ) )  {
            let thresholdSize = threshold < 2 ? -1 : threshold
            meta.set( key, { storeId: -1, prevStoreId: -1, threshold: thresholdSize } )
            state.set( key, new Map<number,T>() )
        }
        //
        // Create new storeId
        //
        let metaInfo = meta.get(key)!
        
        if ( metaInfo.storeId < 0 ||  ! isEqual( objRef, state.get(key)!.get( metaInfo.storeId ) as T ) ) {
            metaInfo.prevStoreId = metaInfo.storeId
            metaInfo.storeId     = storeId.next().value as number
            let lock = `${key}_store`
            await Mutex.doAtomic( lock, async () => {
                state.get(key)!.set( metaInfo.storeId , cloneDeep(objRef) )
                if ( metaInfo.threshold > 1 && state.get(key)!.size > metaInfo.threshold ) {
                    let firstKey  = state.get(key)!.keys().next().value
                    state.get(key)!.delete(firstKey)
                }
                // $log.debug(`REGISTER: ${key}:` + JSON.stringify( state.get(key)[state.get(key).length - 1 ] ) )
            }) 
        }
        return Promise.resolve(metaInfo.storeId)
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