import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import { CxGraph } from "https://deno.land/x/cxgraph/mod.ts"
import { CxStore, CxIterator, CxContinuous  }  from "../cxstore/mod.ts"
import { StoreEntry } from "../cxstore/interfaces.ts"
import {$log, perf, ee, CxError, _ } from "../cxutil/mod.ts"
import { RunIntf, ActionDescriptor, NodeConfiguration } from "./interfaces.ts"
import { Action } from './mod.ts'
import { jobIdSeq, taskIdSeq } from "./generators.ts"
import { ActionDescriptorFactory } from "./actionDescFactory.ts"

const __filename = new URL('', import.meta.url).pathname
export const __dirname = path.dirname( path.fromFileUrl(new URL('.', import.meta.url)) )

export let store = new CxStore()

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
// running one for each class
//
export let initCounts = new Map<string,number>()

// 
// Configuration functions
// 
/**
 * Set the threshold and swarm configuration
 * 
 * @param name Name of the action element
 * @param config The NodeConfiguration  for the action element
 */
 export let setNodeConfig = ( key: string, config: Partial<NodeConfiguration> ): void => {
    if ( ! graph.hasNode(key) ) 
        throw new CxError(__filename, 'setNodeConfig()', 'CONF-0001', `The graph has no node with id: ${key}`)
    else {
        let currConfig = graph.getNodeData(key)
        graph.setNodeData( key, _.merge(currConfig, config) )
    }
}

/**
 * Set the threshold configuration, simpler user function
 * 
 * @param name Name of the storage element
 * @param _threshold The threshold for the storage element, that how many version should be stored before attempting cleanup
 */
export let setThreshold = ( key: string, _threshold: number ): void  => {
    let threshold = _threshold < 2 ? -1 : _threshold
    try {
        setNodeConfig( key, { jobThreshold: threshold } )
    }
    catch(err) {
        throw new CxError( __filename, 'setThreshold()', 'CONF-0002', `Failed to set jobThreshold due to: ${err}` )
    }
}

/**
 * Evaluate and resolve an existing node configuration and return a new configuration - this is a configuration of the job threshold and and the swarm count and max for a given action object
 * 
 * @param name The name of the action object
 * @param name The name of the action object
 * @return NodeConfiguration A new validated node configuration
 * 
 */
 export let resolveActionConfig = (name: string, maxThreshold: number): NodeConfiguration => {
    //
    // Read and resolve the threshold information
    // 
    let nodeConfig: NodeConfiguration = graph.getNodeData(name) 
    let threshold = nodeConfig.jobThreshold
    if ( maxThreshold >= 2  && nodeConfig.jobThreshold >= 2 )  { // threshold is not unlimited
        if ( nodeConfig.jobThreshold < maxThreshold ) {
            threshold =  maxThreshold
        }
        else {
            maxThreshold  = threshold
        }
    }
    else if ( nodeConfig.jobThreshold > 0 ) { // threshold is not unlimited, but ~ 1, where 2 is the minimum
        threshold = 2
    }
    //
    // Read and resolve swarm configuration
    //
    let swarmSeed = nodeConfig.minimum < 2 ? 0 : nodeConfig.minimum
    let swarmMax  = nodeConfig.maximum < swarmSeed ? swarmSeed : nodeConfig.maximum
    return { 
        jobThreshold: threshold, 
        name: name,
        minimum: swarmSeed, 
        maximum: swarmMax, 
        // swarmChildren: nodeConfig.swarmChildren  
    }
}

//
// Convenience utility Store Functions
// 
/**
 * Publish changes to the state of an action - TODO: check if this is really useful
 * 
 * @param action The action instance that want to publish
 */
export let publish = ( action: Action<any> ): Promise<number> => { 
        let storeId = store.set( action.meta.name!, action.state, action.currActionDesc )
        return Promise.resolve(storeId)   
}

/**
 * Get the state for a named action
 * 
 * @param name Name of the action
 * @param idx The index of the state, where the default value (-1) gives you newest state 
 * @return  StoreEntry<T>  Returns a store StoreEntry: { data: T, meta: StateKeys }
 */
export function getState<T>(name:string, idx: number = -1, dataOnly: boolean = true ): StoreEntry<T> | T {
    try {
        if ( dataOnly )
            return store.get(name, idx, dataOnly) as T
        else
            return store.get(name, idx, dataOnly) as StoreEntry<T>
    }
    catch (err) {
        throw new CxError(__filename, 'getState()', 'CTRL-0001',`ctrl.getState("${name}", ${idx}) failed with: ${err}`, err)
    }
}

export function  getStateData<T>(name:string, idx: number = -1 ): T {
    return getState<T>( name, idx, true ) as T
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
export let releaseJobs = async( storeName: string, _threshold: number = -1 ) => {
    try {
        let threshold = _threshold > 2 ? _threshold : (graph.getNodeData(storeName) as NodeConfiguration).jobThreshold ?? 0
        //
        // Find the number of object entries for a given storeName 
        //
        let currJobList = store.indexByName.get(storeName) ?? []
        let currSize    = currJobList.length

        if ( threshold > 2 && currSize > threshold ) {
            let delList = currJobList.slice( 0, threshold )
            let newList = currJobList.slice( threshold, currJobList.length )
            let resList: string[] = []

            delList.forEach( ( jobKey, idx ) => {
                let deleted = true
                store.index.get( jobKey )!.get(storeName)!.forEach( (storeId, idx) => {
                    if ( store.state.get(storeName)!.get(storeId).meta.refCount < 2 ) {
                        store.state.get(storeName)!.get(storeId)!.delete(storeId)
                    }
                    else {
                        store.state.get(storeName)!.get(storeId).meta.refCount -= 1
                        deleted = false
                    }
                })
                if ( deleted ) {
                    store.index.get(jobKey)!.delete(storeName)
                    if ( store.index.get(jobKey)!.size === 0 ) {
                        store.index.delete(jobKey)
                        resList.push(jobKey)
                    }
                }
            })
            store.indexByName.set(storeName, _.xor(newList, resList))
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
        if ( store.isRegistered( name )) {
            throw new CxError(__filename, 'addAction()', 'CTRL-0002',`Action ${name} is already registred in the Store  - call ctrl.removeAction to remove it first`)
        }
        let actionDesc = ActionDescriptorFactory(name)
        try {        
            perf.mark( 'addAction', actionDesc )
            await store.register( name, action.state, actionDesc, action.meta.init ).then(( storeId ) => { 
                actionDesc.storeId   = storeId
                action.currActionDesc = actionDesc       
                graph.addNode( name )
                graph.setNodeData( name, { jobThreshold: 0, minimum: 0, maximum: 0 } as NodeConfiguration )
                actions.set( name, action)
            })
        }
        catch (err) {
            throw new CxError(__filename, 'addAction()', 'CTRL-0003', `Cannot register ${name}`, err)
        }
        finally {
            perf.mark( 'addAction', actionDesc )
            // $plog.debug('Flushing the performence info')
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
        if ( store.isRegistered(actionName) ) { // Swarm instances does not have own store names
            await store.unregister(actionName)
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
export let isDirty = ( actionName: string ): boolean => {
    let hasStoreId = ( store.state.has( actionName ) && store.state.get(actionName)!.size > 0  )
    let storeId = hasStoreId ? store.getStoreId(actionName): -1
    let isDirty = storeId < 0 ? true : false

    if ( !isDirty ){
        let children = graph.dependenciesOf(actionName)
        children.forEach( (childKey: string) => { 
            let childStoreId = store.getStoreId(childKey)
            isDirty = ( storeId < childStoreId || childStoreId < 0 ) 
            if ( isDirty ) return
        })
    }
    // console.log( `Key: ${swarmName} isDirty: ${isDirty}`)
    return isDirty
}

/**
 * Build the map of all dependencies 
 * 
 * @param rootName Name of the action
 * @return A Map of Action Descriptors
 */
export let getActionsToRun  = ( rootName: string, jobId: number | void =  jobIdSeq().next().value, runRoot: boolean = false  ): Map<string, ActionDescriptor> => {
    p.mark('getActionsToRun') // action: rootName
    let actionsToRun = new Map<string, ActionDescriptor>()
    let inversHierarchy  = new Map<string, string>()
    let prevNodeIdent: string[] = []
    if ( graph.hasNode( rootName ) ) { 
        //     
        // iterate through the reverse sorted graph, meaning that you read the leafs first
        //  
        let hierarchy =  graph.hierarchyOf( rootName, true ) 
        let maxThreshold = 2 // The minimum number it can be

        hierarchy.forEach( (ident: string, name: string )  => {
            let storeId  = store.has(name) ? store.getStoreId( name ) : -1 
            
            let nodeConfig = resolveActionConfig(name, maxThreshold)
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
            let ad = new ActionDescriptor()
            ad.rootName     = rootName
            ad.storeName    = name
            ad.actionName   = name
            ad.ident        = ident
            ad.storeId      = storeId  // this is the current StoreId before running the action
            ad.children     = children
            ad.jobId        = jobId as number
            ad.taskId       = taskIdSeq().next().value as number
            ad.forceRunRoot = runRoot
            ad.nodeConfig   = _.clone( nodeConfig )
            actionsToRun.set(name, ad )
            if ( actions?.get(rootName)?.swarm ) {
                actions.get(rootName)!.swarm!.children!.forEach( ( swarmName: string )  => {
                    // console.log( `SWARM ActionDescription ${swarmName}`)
                    let swarmAd        = _.clone(ad)
                    swarmAd.actionName = swarmName
                    swarmAd.nodeConfig = undefined
                    actionsToRun.set(swarmName, swarmAd )
                })
            }   
            prevNodeIdent.push(ident)
        });     
    }
    p.mark('getActionsToRun')
    // descriptors.set(jobId as number, actionsToRun)
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
export let getPromiseChain = ( actionName: string, runAll: boolean = false, runRoot: boolean = false ): RunIntf => {
    let jobId = jobIdSeq().next().value as number
    let jobKey: string =  store.addIndexKey( jobId, 'J' )
    
    p.mark( `promiseChain_${jobId}` )
    let actionsToRun = getActionsToRun(actionName, jobId, runRoot)
    //
    // baseKey is the object initiating the execution chain
    const baseKey = [... actionsToRun.keys()].reverse()[0] 
    
    // Unique job id: eventName
    const eventName: string =  `${baseKey}_Event_${jobId}`
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
    actionsToRun.forEach( (ad, key) => {  
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
                // the promise is assumed to be set at this point
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
        let swarmArr: any[] = []
        if ( actions?.get(ad.rootName)?.swarm ) {
            actions!.get(ad.rootName)!.swarm!.children.forEach( swarmName => {
                let beginEvent = `${swarmName}_${jobId}_run`
                swarmArr.push(new Promise( (resolve, reject) => { ee.on(beginEvent, () => resolve(beginEvent) ) } ) )
            })
        }
        if ( swarmArr.length > 0 ) dependsOn.set(key, Promise.any( swarmArr ) ) 

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
                   try {
                        if ( actions.has(key) ) {
                            let actionObj = actions.get(key) as Action<any> 
                            actionObj.currActionDesc = ad
                            let firstRun = ( actionObj.meta.callCount === 0 && actionObj.meta.init === false ) 
                            let dirty = ( ( ad.forceRunRoot && ad.storeName === ad.rootName ) || isDirty( ad.storeName ) ||  runAll || firstRun )
                            if ( dirty ) {
                                res = await actionObj.__exec__ctrl__function__ (ad)
                                ad.ran = true
                                actionObj.meta.callCount += 1
                            }
                            else { 
                                //
                                // Add to the job-index even when action is not dirty/not called
                                //
                                store.setIndexId(ad.storeName, jobKey, store.getStoreId( ad.storeName ) )
                            }
                            ad.isDirty = dirty
                            ad.success  = res || ! dirty                    
                            ad.storeId = store.getStoreId( actionObj.meta.name!, -1 )
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
                        // console.log(`finish: ${finishEvent}`)
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
    })
    p.mark( `promiseChain_${jobId}` ) 
    return {
        getEventName():    string  { return eventName },
        getJobId():        number  { return jobId },
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
    let jobKey: string =  store.addIndexKey( jobId, 'J' )

    let actionsToRun = getActionsToRun(actionName, jobId) 
    p.mark(`runTarget_${jobId}`) // , actionsToRun.get(swarmName)

    let resAll = true
    if ( graph.hasNode( actionName) ) {
        actionsToRun.forEach( async ( actionDesc: ActionDescriptor, name: string ) => {          
            p.mark(`F_${actionDesc.actionName}_${actionDesc.jobId}`) 
        
            let actionObj = actions.get( actionDesc.actionName ) as Action<any>
            let eventName = !_.isUndefined( actionObj.meta.swarmName! ) && actionObj.meta.swarmName !== actionObj.meta.name ? actionObj.meta.swarmName : actionObj.meta.name
            let finishEvent = `${eventName}_${jobId}_fin`
            let funcName: string = actionObj.meta.funcName as string
            try {
                let res = false 
                actionObj.currActionDesc = actionDesc
                let firstRun = ( actionObj.meta.callCount === 0 && actionObj.meta.init === false ) 
                let dirty = ( ( runRoot && actionDesc.storeName === actionDesc.rootName ) || isDirty( actionDesc.storeName ) ||  runAll || firstRun )
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
                    store.setIndexId(actionDesc.storeName, jobKey, store.getStoreId( actionDesc.storeName ) )
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
