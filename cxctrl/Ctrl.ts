import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import { CxGraph } from "https://deno.land/x/cxgraph/mod.ts"
import { CxStore }  from "../cxstore/mod.ts"
// import { CxIterator, CxContinuous } from "../cxiterate/mod.ts"
import { StoreEntry } from "../cxstore/interfaces.ts"
import { $log, perf, ee, CxError, _, Mutex, debug } from "../cxutil/mod.ts"
import { RunIntf, ActionDescriptor, PromiseChainArgsType, ActionDescriptorType } from "./interfaces.ts"
import { SwarmChildType, SwarmMasterType } from "../cxswarm/interfaces.ts"
import { Action } from './mod.ts'
import { jobIdSeq, taskIdSeq } from "./generators.ts"
import { ActionDescriptorFactory } from "./actionDescFactory.ts"
import { config } from "../cxconfig/mod.ts"
import { NodeConfiguration } from "../cxconfig/interfaces.ts"
import { actionDescriptorFac, promiseChainArgsFac } from "./factories.ts";


const __filename = new URL('', import.meta.url).pathname
export const __dirname = path.dirname( path.fromFileUrl(new URL('.', import.meta.url)) )

// Main User Data Store
export let store = new CxStore()
// Ctrl Run state
export let runState  = new CxStore('intern')

//
// Mutex 
// 
export const mutex = new Mutex()

//
// Debug logger
//
const cbug = debug('ctrl') 

//
// Performance measurement and logger instance
//
export let p = perf

//
// Internal ctrl meta data
//
export let graph: CxGraph  = new CxGraph()
export let actions         = new Map<string, Action<any>>() 

//
// Keep track of initilizations to avoid calling Action initialization twice due to the decorator 
// running one time for each class when using extends
//
export let initCounts = new Map<string,number>()

//
// Convenience utility Store Functions
// 
/**
 * Publish changes to the state of an action - TODO: check if this is really useful
 * 
 * @param action The action instance that want to publish
 */
 export let publish = ( action: Action<any> ): number => {  
    let _store = action.meta.intern ? runState: store
    let storeId = _store.set( action.meta.name!, action.state, action.currActionDesc )
    action.currActionDesc.storeId = storeId
    return storeId
}

/**
 * Get the state for a named action
 * 
 * @param name Name of the action
 * @param idx The index of the state, where the default value (-1) gives you newest state 
 * @return  StoreEntry<T>  Returns a store StoreEntry: { data: T, meta: StateKeys }
 */
export function getState<T>(name:string, idx: number = -1, dataOnly: boolean = true ): StoreEntry<T> | T {
    let keys: string[] = []
    try {
        let action = actions.get(name)!
        let _store = action.meta.intern ? runState: store

        keys = [ ..._store.state.keys() ]
        cbug('Store Keys: %o', keys)
        if ( dataOnly )
            return _store.get(name, idx, dataOnly) as T
        else
            return _store.get(name, idx, dataOnly) as StoreEntry<T>
    }
    catch (err) {
        throw new CxError(__filename, 'getState()', 'CTRL-0001',`ctrl.getState("${name}", ${idx}) failed for keys: ${keys}`, err)
    }
}

export function  hasStateData<T>(name:string, idx: number = -1 ): boolean {
    let storeRec = getState<T>( name, idx, false ) as StoreEntry<T> 
    return ( storeRec && ! _.isUndefined( storeRec.data ) ) 
}

export function  getStateData<T>(name:string, idx: number = -1 ): T {
    cbug(`getStateData() for: ${name}`)
    return getState<T>( name, idx, true ) as T
}

/**
 * Gets a reference to the named object of type <StoreEntry<T>>
 * 
 * @param key The storeName of the indexed object
 * @return T | undefined if the indexed object does not exist
 */
export function getMapRef<T>(key: string): Map<number, StoreEntry<T>> {
    let action = actions.get(key)!
    let _store = action.meta.intern ? runState: store
    if ( _store.state.has(key) )
        return _store.state.get(key) as Map<number, StoreEntry<T>>
    else 
        return new Map<number, StoreEntry<T>>()
}
// 
// Job functions 
//
/**
 * Delete entries relate to a specific job Id
 * 
 * @param storeName The name of the action object
 * @param threshold An optional threshold that can be provided to overwrite the configured threshold
 * 
 */
export let releaseJobs = async( action: Action<any>, _threshold: number = -1 ) => {
    let storeName = action.meta.name!
    try {
        let _store = action.meta.intern ? runState: store
        let threshold = _threshold > 2 ? _threshold : (config.nodeConfig.get(storeName) as NodeConfiguration).jobThreshold ?? 0
        //
        // Find the number of object entries for a given storeName 
        //
        let currJobList = _store.indexByName.get(storeName) ?? [] as string[]
        let currSize    = currJobList.length

        if ( threshold > 2 && currSize > threshold ) {
            let delList = currJobList.slice( 0, threshold )
            let newList = currJobList.slice( threshold, currJobList.length )
            let resList: string[] = []

            delList.forEach( ( jobKey: string , idx: number ) => {
                let deleted = true
                _store.index.get( jobKey )!.get(storeName)!.forEach( (storeId: number, idx: number) => {
                    if ( _store.state.get(storeName)!.get(storeId).meta.refCount < 2 ) {
                        _store.state.get(storeName)!.get(storeId)!.delete(storeId)
                    }
                    else {
                        _store.state.get(storeName)!.get(storeId).meta.refCount -= 1
                        deleted = false
                    }
                })
                if ( deleted ) {
                    _store.index.get(jobKey)!.delete(storeName)
                    if ( _store.index.get(jobKey)!.size === 0 ) {
                        _store.index.delete(jobKey)
                        resList.push(jobKey)
                    }
                }
            })
            _store.indexByName.set(storeName, _.xor(newList, resList))
        }
    }
    catch(err) {
        throw new CxError(__filename, 'ctrl.releaseJobs ()', 'CTRL-0014',`Failed to release jobs for : ${storeName}`, err)
    }
}

/**
 * Add an array of dependencies (containing names of actions) for a named action
 * 
 * @param actionName   Name of the action
 * @param dependencies Array of dependencies
 */
export let  addDependencies = ( actionName: string, dependencies: string[] ): void => {
    for ( let dependency of dependencies ) { 
        graph.addDependency( actionName, dependency )
    } 
}

/**
  *  Add an array of dependencies (containing names of actions) for a named action
  * 
  * @param actionName Name of the action
  * @param dependency Name of dependency
  */
export let addDependency = ( actionName: string, dependency: string ): void => addDependencies(actionName, [dependency])

//
// Action functions
//
/**
 * Add an action to the Graph based IoC System
 * 
 * @param action Add an action to the Ctrl set of actions:
 *      - register the data structure (the state) in the store
 *      - add the action to the graph structure
 */
export let addAction = async ( action: Action<any>, decoCallCnt: number = 0 ): Promise<Action<any>> => {
    if ( decoCallCnt === 1 ) { 
        // decorator calls multiple times, once for each class extends, but only the first is relevant
        let name = action.meta.name!
        let _store = action.meta.intern ? runState: store
        if ( _store.isRegistered( name )) {
            throw new CxError(__filename, 'addAction()', 'CTRL-0002',`Action ${name} is already registred in the Store  - call ctrl.removeAction to remove it first`)
        }
        let actionDesc = ActionDescriptorFactory(name)
        // TODO: change to let actionDesc = actionDescriptorFac( { rootName: name, actionName: ... })
        try {        
            perf.mark( 'addAction', actionDesc )
            await _store.register( name, action.state, actionDesc, action.meta.init ).then(( storeId ) => { 
                actionDesc.storeId   = storeId
                action.currActionDesc = actionDesc    
                graph.addNode( name )
                config.nodeConfig.set( name, { jobThreshold: 0, minimum: 0, maximum: 0 } as NodeConfiguration )
                actions.set( name, action)
            })
        }
        catch (err) {
            throw new CxError(__filename, 'addAction()', 'CTRL-0003', `Cannot register ${name}`, err)
        }
        finally {
            perf.mark( 'addAction', actionDesc )
        }
    }
    return Promise.resolve(action)
}

/**
 * Remove an action from the Ctrl structure
 * 
 * @param actionName Name of the action to be removed
 * @return void Promise
 */
export let removeAction = async ( actionName: string ): Promise<void> => {
    try {
        let action = actions.get(actionName)!
        let _store  = action.meta.intern ? runState: store
        if ( _store.isRegistered(actionName) ) { // Swarm instances does not have own store names
            await _store.unregister(actionName)
        }
        graph.removeNode(actionName)
        actions.delete(actionName)
        initCounts.delete(actionName)
    }   
    catch(err) {
        throw new CxError(__filename, 'removeAction()', 'CTRL-0013', `removeAction for ${actionName} failed.`, err)
    }
}

/**
 * Check if an action exists in the Ctrl actions map
 * 
 * @param actionName Name of the action
 * @return Success or failure in a boolean
 */
export let hasAction = ( actionName: string ): boolean => {
    return actions.has(actionName)
}

/**
 * Clear the whole Ctrl action structure - this function is destructive!
 */
let clear = () => {
    let actionList = [ ...actions.keys() ]
    actionList.forEach( (key) => { 
        removeAction(key)
    })
}

//
// Process and execution
// 
/**
 * Check whether an action's state is dirty 
 * 
 * @param actionsName The name of the action to check
 * @return true for isDirty, otherwise false 
*/
export let isDirty = ( action: Action<any> ): boolean => {
    let actionName = action.meta.name!
    let _store = action.meta.intern ? runState: store
    let hasStoreId = ( _store.state.has( actionName ) && _store.state.get(actionName)!.size > 0  )
    let storeId = hasStoreId ? _store.getStoreId(actionName): -1
    let isDirty = storeId < 0 ? true : false

    if ( !isDirty ){
        let children = graph.dependenciesOf(actionName)
        children.forEach( (childKey: string) => { 
            let childStoreId = _store.getStoreId(childKey)
            isDirty = ( storeId < childStoreId || childStoreId < 0 ) 
            if ( isDirty ) return
        })
    }
    return isDirty
}

/**
 * Build the map of all dependencies 
 * 
 * @param actionName Name of the action
 * @return A Map of Action Descriptors
 */
export let getActionsToRun  = ( 
    arg: PromiseChainArgsType
    /*
    actionName: string, 
    jobId: number | void =  jobIdSeq().next().value, 
    runRoot: boolean = false  
    */
): Map<string, ActionDescriptorType> => 
{
    p.mark('getActionsToRun') // action: rootName
    let actionsToRun = new Map<string, ActionDescriptorType>()
    let inversHierarchy  = new Map<string, string>()

    let prevNodeIdent: string[] = []
    if ( graph.hasNode( arg.actionName ) ) { 
        //     
        // iterate through the reverse sorted graph, meaning that you read the leafs first
        //  
        let hierarchy =  graph.hierarchyOf( arg.actionName, true ) 
        let maxThreshold = 2 // The minimum number it can be
        cbug('HIE: %O', hierarchy)

        hierarchy.forEach( (ident: string, name: string )  => {
            let action   = actions.get(name)!
            let _store   = action.meta.intern ? runState                  : store
            let storeId  = _store.has(name)   ? _store.getStoreId( name ) : -1 
            
            let nodeConf = config.resolveActionConfig(name, maxThreshold)
            //
            // Match all direct children
            //
            inversHierarchy.set(ident, name)

            let currChildNames: string[] = prevNodeIdent.filter( child => {
                let parent = child.substr(0, child.lastIndexOf('.') ) 
                return  parent === ident
            }) 
            //
            // Build Array of children of the current node
            //
            let children: string[] = []
            currChildNames.forEach( childName => { 
                children.push( inversHierarchy.get( childName )! ) 
            })
            //
            // Set the action Descriptor
            //
            let ad = actionDescriptorFac({
                rootName     : arg.actionName,
                storeName    : name,
                actionName   : name,
                ident        : ident,
                storeId      : storeId,  // this is the current StoreId before running the action
                children     : children,
                jobId        : arg.jobId as number,
                taskId       : taskIdSeq().next().value as number,
                forceRunRoot : arg.runRoot,
                nodeConfig   : _.clone( nodeConf )  
            })
            //
            // Handle Swarmed actions
            //
            let swarm = actions.get(ad.actionName)!.swarm as SwarmMasterType
            if ( swarm.init ) {
                let children =  arg.children.length > 0 ? arg.children : swarm.children;
                
                (children ?? []).forEach( ( swarmName: string )  => {
                    let swarmAd        = _.clone(ad)
                    swarmAd.actionName = swarmName
                    swarmAd.nodeConfig = undefined
                    actionsToRun.set(swarmName, swarmAd )
                })
            }   
            actionsToRun.set(name, ad )
            prevNodeIdent.push(ident)
        });     
    }
    p.mark('getActionsToRun')
    // descriptors.set(jobId as number, actionsToRun)
    cbug('Actions in getActionsToRun(): %o', Object.keys(actionsToRun))
    return _.clone(actionsToRun)
}

/**
 * Build the Promise chain for executing the actionsToRunMap 
 * TODO: also provide an Observables implementation of this
 * 
 * @param actionName  The storeName of the Action to be executed 
 * @param runAll If set to true the whole chain is run otherwise only dirty Actions are rerun
 * @param runRoot If true the root object of the is executed whether it is dirty or not
 * @returns ActionDescriptorIntf An Action descriptor interface containng a run() funtion that emits a run event for this action chain
 */
export let getPromiseChain = ( 
    arg: PromiseChainArgsType
    /*
    actionName: string, 
    runAll: boolean = false, 
    runRoot: boolean = false,
    jobId    = jobIdSeq().next().value as number
    */
): RunIntf => 
{
    let action   = actions.get(arg.actionName)!
    let _store    = action.meta.intern ? runState: store
    let jobKey: string =  _store.addIndexKey( arg.jobId, 'J' )
    
    p.mark( `promiseChain_${arg.jobId}` )
    // let actionsToRun = getActionsToRun(pc.actionName, pc.jobId, pc.runRoot)
    let actionsToRun = getActionsToRun(arg)
    //
    // baseKey is the object initiating the execution chain
    //
    cbug('Actions to run: %o', [... actionsToRun.keys()] )

    const baseKey = [... actionsToRun.keys()].reverse()[0] 
    
    // Unique job id: eventName
    const eventName: string =  `${baseKey}_Event_${arg.jobId}`
    //
    // Create an initial promise that listens for a triggering event, 
    // allowing us to control when the whole transaction chain of promises are activated
    //
    let eventTrig: Promise<void> = new Promise( (resolve, reject) => {
        ee.on(eventName, () => resolve() )  
    }) 
    // 
    // Build the promise chain of actions to run
    //
    for ( let [key, ad] of actionsToRun ) {
        //
        // Handle child nodes that the target node depens on
        // 
        let dependsOn =  new Map<string, Promise<unknown>>()
        //
        // Prevent the leaf nodes from running immediately by making them dependent on 
        // the event promise defined above
        //
        if ( ad.children.length ==  0 ) {       
            //
            // Generic handling for leaf objects
            //
            dependsOn.set(eventName, eventTrig)      
        }
        else {
            ad.children.forEach( (childKey: string) => {
                //
                // Since the actionToRun list is reverse sorted
                // the promise is set at this point
                //
                try {
                    dependsOn.set(childKey, actionsToRun.get(childKey)!.promise!)
                    actionsToRun.get(childKey)!.eventName = eventName
                }
                catch( err ) { 
                    throw new CxError(__filename, 'getPromiseChain()', 'CTRL-0005', `ChildKey ${childKey}.promise is undefined`)
                }       
            })
        }
        //
        // Handling for swarmed objects: swarm master will wait for any one of the swarm children to emit a run event
        // 
        if ( actions.get(key)?.isSwarmMaster() ) {
            let swarmArr: any[] = []
            if ( actions?.get(key)?.swarm ) {
                let children = ( actions!.get(key)!.swarm! as SwarmMasterType).children
                children.forEach( ( swarmName: string ) => {
                    let beginEvent = `${swarmName}_${arg.jobId}_run`
                    swarmArr.push(new Promise( (resolve, reject) => { ee.on(beginEvent, () => {
                        cbug('%s GOT: %s', key, beginEvent)
                        resolve(beginEvent) 
                        })  
                    }) 
                    )
                })
                if ( swarmArr.length > 0 ) {
                    //
                    // make the swarm master startuo depend on a run event from ANY of it's children 
                    //
                    dependsOn.set(`${key}_swarm_startup`, Promise.any( swarmArr ) ) 
                }
            }
        }
        //
        // Create Promises for the execution tree
        //
        if ( [ ...dependsOn.values() ].length > 0 )  {             
            actionsToRun.get(key)!.promise = Promise.all([ ...dependsOn.values() ] )
            .then( () => {
                return new Promise( async (resolve) => {
                    p.mark(`P_${key}_${ad.jobId}`) 
                    let finishEvent = `${key}_${ad.jobId}_fin`
                    let res = false 
                    let dirty = false
                     /*
                    * Run the actionObject if:
                    * - If object is a runable node and not an artificial non-object added "top node" in the graph
                    * - The object has newer/dirty child objects 
                    * - The runAll flag is set to true
                    * - The object callCount is 0 (firstRun) and the object.meta.init is set to false (the default)
                    */
                    let actionObj = actions.has(key) ? actions.get(key) as Action<any>: undefined
                    try {
                        if ( actionObj ) {
                            (actionObj.swarm as SwarmChildType).active = true
                            let _store    = action.meta.intern ? runState: store
                            actionObj.currActionDesc = ad
                            let firstRun = ( actionObj.meta.callCount === 0 && actionObj.meta.init === false ) 
                            let dirty = ( ( ad.forceRunRoot && ad.storeName === ad.rootName ) || isDirty( actionObj ) ||  arg.runAll || firstRun )
                            
                            cbug  ( 'DIRTY[%s]: %s', key, dirty)

                            if ( dirty ) {
                                res = await actionObj.__exec__ctrl__function__ (ad)
                                ad.ran = true
                                actionObj.meta.callCount += 1
                            }
                            else { 
                                //
                                // Add to the job-index even when action is not dirty/not called
                                //
                                _store.setIndexId(ad.storeName, jobKey, _store.getStoreId( ad.storeName ) )
                            }
                            ad.isDirty = dirty
                            ad.success  = res || ! dirty                    
                            ad.storeId = _store.getStoreId( actionObj.meta.name!, -1 )
                            ad.eventName = eventName
                            cbug('P_%s_%d: %j', key , ad.jobId, ad)
                            actionObj.currActionDesc = ad
                        }
                        else {
                            ad.success = true
                            ad.ran = true
                        }
                    }
                    catch ( err ) {
                        throw new CxError(__filename, 'promise()', 'CTRL-0008', `action ${ad.actionName}.promise exec failed`, err)
                    }
                    finally {
                        if ( actionObj ) (actionObj.swarm as SwarmChildType).active = false 
                        ee.emit(finishEvent)
                        p.mark(`P_${key}_${ad.jobId}`, ad)
                        resolve(key)
                    }
                })
                .catch( (e)  =>  {
                    $log.error(e)
                    throw (e)
                })
                .finally ( () => {
                    if ( key === baseKey ) ee.emit( `${eventName}_fin` )
                })
            }, 
            // in case "then()" is rejected
            reason => { throw(reason) } ) 
        }         
    }
    p.mark( `promiseChain_${arg.jobId}` ) 
    return {
        getEventName():    string  { return eventName },
        getJobId():        number  { return arg.jobId },
        getActionsToRun(): Map<string, ActionDescriptor>  { return actionsToRun },
        async run():       Promise<void> { 
                                //
                                // Emit the event that starts the 
                                // execution of the promise chains
                                //
                                ee.emit( eventName ) 
                                return new Promise( (resolve, reject) => { 
                                    //
                                    // Wait for the completion event
                                    //
                                    ee.on(`${eventName}_fin`, () => {
                                        for ( let [k, ad ] of this.getActionsToRun() ) {
                                            //
                                            // Emit a publish event
                                            //
                                            ad.ran && ee.emit( `${ad.storeName}_pub` )
                                        }
                                        resolve() 
                                    })
                                })
                            }
    }
}

/**
 * Synchronously runs all dependencies of a target action in order one by one and then the action itself
 * 
 * @param actionName The storeName of the action to run
 * @param runAll If set to true the whole chain is run otherwise only dirty Actions are rerun
 * @param runRoot If true the root object of the is executed whether it is dirty or not
 * @return True if all actions ran successfully, otherwise false
 */
export let runTarget = ( actionName: string, runAll: boolean = false, runRoot: boolean = false ): Promise<boolean> => {
    let jobId = jobIdSeq().next().value as number
    let action   = actions.get(actionName)!
    let _store    = action.meta.intern ? runState: store
    let jobKey: string =  _store.addIndexKey( jobId, 'J' )

    let actionsToRun = getActionsToRun( promiseChainArgsFac( {
        actionName: actionName, 
        jobId: jobId
        })
    ) 

    p.mark(`runTarget_${jobId}`) // , actionsToRun.get(swarmName)

    let resAll = true
    if ( graph.hasNode( actionName) ) {
        actionsToRun.forEach( async ( actionDesc: ActionDescriptor, name: string ) => {          
            p.mark(`F_${actionDesc.actionName}_${actionDesc.jobId}`) 
        
            let actionObj = actions.get( actionDesc.actionName ) as Action<any>
            let _store    = action.meta.intern ? runState: store
            let eventName = actionObj.getName()
            let finishEvent = `${eventName}_${jobId}_fin`
            let funcName: string = actionObj.meta.funcName as string
            try {
                let res = false 
                actionObj.currActionDesc = actionDesc
                let firstRun = ( actionObj.meta.callCount === 0 && actionObj.meta.init === false ) 
                let dirty = ( ( runRoot && actionDesc.storeName === actionDesc.rootName ) || isDirty( actionObj ) ||  runAll || firstRun )
                if ( dirty ) {
                    //
                    // Run the objects main function
                    //
                    res = await (actionObj as any)[funcName]()  // call it
                    actionDesc.ran     = true
                    actionObj.meta.callCount += 1
                }
                else { 
                    // Add to job-index even when action is not dirty/not being called
                    _store.setIndexId(actionDesc.storeName, jobKey, _store.getStoreId( actionDesc.storeName ) )
                }
                actionDesc.isDirty = dirty
                actionDesc.success = res || ! dirty
                actionObj.currActionDesc = actionDesc
                resAll = res && resAll? res : false
            }
            catch (err) {
                throw new CxError(__filename, 'runTarget()', 'CTRL-0006', `Failed to run ${actionDesc.actionName}: ${err}`, err)
            }
            finally {
                ee.emit(finishEvent)
                p.mark(`F_${actionDesc.actionName}_${actionDesc.jobId}`, actionDesc )
            }
        })
    }
    else throw new CxError(__filename, 'runTarget()', 'CTRL-0007', `Unknown swarmName: ${actionName}`)
      
    p.mark(`runTarget_${jobId}`)
    return Promise.resolve(resAll)         
}
