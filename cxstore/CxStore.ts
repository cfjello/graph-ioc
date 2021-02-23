import { StateMetaData, StoreEntry, IterateIndexMap } from "./interfaces.ts"
import { ActionDescriptor } from "../cxctrl/interfaces.ts"
import { ActionDescriptorFactory } from "../cxctrl/actionDescFactory.ts"
import { storeIdSeq } from "./generators.ts"
import { _ } from "../cxutil/mod.ts"
import { Mutex, $log, ee, CxError } from "../cxutil/mod.ts"

const __filename = new URL('', import.meta.url).pathname;

export class CxStore {
    /**
     * Cxstore class implementing the StoreIntf
     * 
     */ 
    state           = new Map<string, Map<number, any>>()
    meta            = new Map<string, StateMetaData>()
    index           = new Map<string, Map<string, Array<number>>>()
    // iterators       = new Map<string, IterateIndexMap>()
    indexMeta       = new Map<string, {prefix: string, selector: Function}>()

    updIdx: number  = 0
    config          = new Map<string,any>()

    /**
     * Register saves a deep copy of an object to the Store (register is a synonym for the set function)
     * @template T The type of the object
     * @param key The store name of the object
     * @param objRef A reference to the object to be stored
     * @returns The storeId of the object 
     */
    async register<T> ( 
        key: string, objRef: T, ad: ActionDescriptor | undefined = undefined, init: boolean = true ): Promise<number> {       
        let storeId: number = -1
        if ( init ) 
            storeId = this.set( key, objRef, ad ) 
        else 
            storeId = this.initStoreKey<T>(key).storeId

        return Promise.resolve(storeId)
    } 

    async unregister (key: string): Promise<boolean> {
        if ( this.state.has(key) ) { 
            await Mutex.doAtomic( key, async () => {
                    this.state.delete(key)
                    this.meta.delete(key)
                    // TODO: Delete from index as well
                }) 
        }
        else 
            throw new CxError(__filename, 'unregister()', 'STORE-0002', `Cannot find a store object named: ${key}`)

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
     * Adds a new index for a named store object jobId based on some named fields 
     * 
     * @param idxId    The index Id of the indexed object
     * @param prefix   The index prefix, a string to be added in front of the index id (idxId)
     * @return string  The index identifier
     */
    createIndex<T>( name: string, prefix: string, selector: Function): void {
        if ( this.indexMeta.has( prefix ) ) { 
            throw new CxError(__filename, 'store.createIndex()', 'STORE-0011', `Duplicate index prefix: ${prefix}, when trying to create index`)
        }
        else if ( ! this.state.has(name) ) {
            throw new CxError(__filename, 'store.createIndex()', 'STORE-0012', `Index target state object: ${name}, does not exist in the Store`)
        }
        this.indexMeta.set(name, { prefix: prefix, selector: selector } )
    }

    /**
     * Adds a given index identifier if it does not exixt, e.g. a jobId to the index
     * 
     * @param idxId    The index Id of the indexed object
     * @param prefix   The index prefix, a string to be added in front of the index id (idxId)
     * @return string  The index identifier
    */
    addIndexKey( idxId: number, prefix: string = 'J' ): string {
        let idxKey: string = prefix + idxId
        if ( ! this.index.has( idxKey ) ) { 
            this.index.set( idxKey , new Map<string,Array<number>>() ) 
        }
        return idxKey   
    }
  
    /**
     * Determines whether index object exists for a given index Id
     * 
     * @param key The name of the indexed object
     * @param idxId  The index Id of the indexed object
     * @return boolean
     */
    hasIndexId (key: string, idxId: number, prefix: string = 'J'): boolean {
        let idxKey: string = prefix + idxId
        return ( this.index.has(idxKey) && this.index.get(idxKey)!.has(key) )
    }

     /**
     * Sets the index for a given index Id (defined as a number and a fixed prefix) and defaults to the previous storeId if no storeId is given
     * (This is usefull for generation an index for the objects created given job run)
     * 
     * @param key The name of the indexed object
     * @param idxId  The idxId of the indexed object
     * @param prefix  The index prefix that define the type of index, e.g. key=189 and prefix 'S' result in index key: 'S189' 
     * @return void
     */
    setIndexId (key: string, idxId: number, storeId: number, prefix: string = 'J' ): void {
        if ( ! this.hasStoreId( key , storeId ) ) {
            throw new CxError(__filename, 'setIndexId()', 'STORE-0003', `No storeId for ${key} with storeId ${storeId} in store`)
        }
        let idxKey: string =  this.addIndexKey(idxId, prefix)
        if ( ! this.index.get( idxKey)!.has(key) ) this.index.get(idxKey)!.set(key, [])
        this.index.get(idxKey)!.get(key)!.push(storeId)
    }

     /** TODO: decide whether this function getIndexStoreId() is useful
     * Gets the storeId for a given key, idxId and prefix 
     * 
     * @param key The name of the indexed object
     * @param idxId  The idxId of the indexed object
     * @param prefix  The index prefix that define the type of index, e.g. key=189 and prefix 'S' result in index key: 'S189' 
     * @return void

    getIndexStoreId( key: string, idxId:number, prefix: string = 'J' ) : number {
        let idxKey: string = prefix + idxId
        if ( ! this.hasIndexId( key, idxId, prefix ) )
            throw new CxError(__filename, 'getIndexStoreId()', 'STORE-0005', `Cannot find index entry for ${idxKey}[${key}]`)
        else
            return this.index.get(idxKey)!.get(key)
    }
    */

    /**
     * Gets a collection of StoreIDs for a given key, idxId and prefix - this i.e. can be used 
     * to fetch references to all objects related to a given index Id. Object-states in the collection cannot be updated
     * 
     * @param key The name of the indexed object
     * @param idxId  The idxId of the indexed object
     * @param prefix  The index prefix that define the type of index, e.g. key=189 and prefix 'S' result in index key: 'S189' 
     * @return Map<string, any> A map of named objects and thier StoreIDs
    
   
    getCollection( idxId:number, prefix: string = 'J', dataOnly: boolean = true ) : Map<string, any> {
        let idxKey: string = prefix + idxId
        let collection = new Map<string, any>()
        try {
            let debugDummy = this.index.get(idxKey)!
            this.index.get(idxKey).forEach( ( storeId, key ) => {
                this.get(key, storeId, dataOnly)
                collection.set( key, this.get(key, storeId, dataOnly) )
            })
            return collection
        }
        catch(err) {
            throw new CxError(__filename, 'getCollection()', 'STORE-0006', `Cannot fetch Collection storeIDs`, err)
        }
    }
*/

    /**
     * Gets the object-state for a named indexed object of type S
     * 
     * @param key The name of the indexed object
     * @param idxId  The index Id of the indexed object
     * @param prefix  The index prefix that define the type of index, e.g. key=189 and prefix 'S' result in index key: 'S189' 
     * @return S | undefined if the indexed object does not exist
     */
    getIndexState<S>(key: string, idxId: number, prefix: string = 'J' ): StoreEntry<S>[] | undefined {
        let idxKey: string = prefix + idxId
        if ( this.hasIndexId(key, idxId) ) {
            let storeId = this.index.get(idxKey)!.get(key)
            return this.get(key) as StoreEntry<S>[]
        }
        else
            return undefined
    }
   
    /**
     * Get current last store id for an entry store
     * 
     * @param key The name of the stored object
     * @param storeId The number of the version to retrieve, -1 defaulting to the most recent one
     * @return The storeId index and -1 if not existing
     */
    getStoreId( key: string, storeId: number = -1 ) : number {
        let idx = storeId
        if ( this.isRegistered(key) ) { 
            idx = this.meta.get(key)!.storeId
            if ( storeId > -1 ) {
                if ( this.hasStoreId( key, storeId ) ) 
                    idx = storeId
                else 
                    idx = -1
            }
        }
        else 
            throw new CxError(__filename, 'store.getStoreId()', 'STORE-0007', `Key: ${key} does not exist`)
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
    get<T>( key: string, _storeId:number = -1, dataOnly: boolean = true ): T | StoreEntry<T> {
            let storeId = this.getStoreId( key, _storeId )
            if ( dataOnly )
                return this.state.get(key)!.get(storeId).data as  T
            else
                return this.state.get(key)!.get(storeId) as StoreEntry<T> 
    }


    initStoreKey<T>( key: string, storeId: number = -1): StateMetaData {
        //
        // Do we have a new key? If so we create the meta info
        //
        if ( ! this.state.has( key ) )  {
            this.state.set( key, new Map<number,T>() ) 
        }

        this.meta.set( key, { storeId: storeId, prevStoreId: -1, prevJobId: -1 , prevTaskId: -1 } as StateMetaData )
        return this.meta.get(key)!   
    }

    /**
     * Saves a deep copy of an object to the Store
     * @template S The type of the object
     * @param key The store name of the object
     * @param objRef A reference to the object to be stored
     * @param threshold The number of entries in the immutable collection to keep ( less than 2 for unlimited, otherwise the number given )
     * @returns The storeId of the object 
     */
    set<T>( key: string, objRef: T, _actionDesc: ActionDescriptor | undefined  ): number  {
        let newMetaInfo: StateMetaData
        let storeId    = storeIdSeq().next().value as number
        if (   _.isUndefined( key) ) throw new CxError(__filename, 'store.set()', 'STORE-0008', `Undefined store key: ${key}`)   
        if ( ! _.isObject( objRef) ) throw new CxError(__filename, 'store.set()', 'STORE-0009', `Object must be passed to the store`)
        try {  
            //
            // If the ActionDescriptor is not initialized ( that is if this was called directly ) then initialize
            // 
            let ad: ActionDescriptor = _.isUndefined(_actionDesc) ? ActionDescriptorFactory(key): _actionDesc!
            //
            // Do we have a new key? If so we create the meta info
            //
            let metaInfo: StateMetaData = this.initStoreKey( key, storeId ) 
            //
            // Build and Store the data
            //
            let objClone: T = Object.freeze( _.cloneDeep( objRef ) )
            //
            // Store the cloned data
            //
            this.state.get(key)!.set( storeId , { data: objClone as T, meta: { jobId: ad.jobId, taskId: ad.taskId } } as StoreEntry<T> )
            //
            // store the job-index reference
            //
            this.setIndexId(key, ad.jobId, storeId )
            //
            // set the updated metaData with the current storeId
            //
            this.meta.set( key, metaInfo )
        }
        catch(err) {
            throw new CxError(__filename, 'store.set()', 'STORE-0010', `failed to store data for ${key}`, err)
        }
        return storeId
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