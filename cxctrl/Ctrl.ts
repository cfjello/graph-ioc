import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import { CxGraph } from "https://deno.land/x/cxgraph/mod.ts"
import { CxStore }  from "../cxstore/CxStore.ts"
import {$log, perf, ee, CxError } from "../cxutil/mod.ts"
import { RunIntf, ActionDescriptor } from "./interfaces.ts"
import { Action } from './Action.ts'
import { jobIdSeq, taskIdSeq } from "./generators.ts"

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
export let descriptors     = new Map<number, Map<string, ActionDescriptor>>()
export let promises        = new Map<string, Promise<any>>()

//
// Keep track of initilizations to avoid calling Action initialization twice due to the decorator 
// running one for each class
//
export let initCounts = new Map<string,number>()

//
// Store Functions
// 
/**
 * Publish changes to the state of an action
 * 
 * @param action The action instance that want to publish
 */
export let publish = async ( action: Action<any> ): Promise<number> => { 
        let storeId = await store.set( action.meta.name!, action.state, -1, action.currActionDesc )
        return Promise.resolve(storeId)   
}

/**
 * Get the state for a named action
 * 
 * @param name Name of the action
 * @param idx The index of the state, where the default value (-1) gives you newest state 
 */
export let  getState = (name:string, idx: number = -1): any =>  {
    try {
        return store.get(name, idx)
    }
    catch (err) {
        throw new CxError(__filename, 'getState()', 'CTRL-0001',`ctrl.getState("${name}", ${idx}) failed with: ${err}`, err)
    }
}

 /**
  *  Add an array of dependencies (containing names of actions) for a named action
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
 * Add an initial Descriptor for an Action 
 * 
 * @param name  The name of the Action:
 * @return ActionDescriptor  A descriptor object with some initialized values  
 */
export function ActionDescriptorFactory( name: string ): ActionDescriptor {
    return new ActionDescriptor( 
                  name, // rootName
                  name, // name
                  '00.00',  // ident
                  jobIdSeq().next().value  as number,  // jobId
                  taskIdSeq().next().value as number  // taskId
    )
  }

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
            await store.register( name, action.state, -1, actionDesc ).then(() => { 
                actionDesc.storeId   = store.getStoreId( name)
                action.currActionDesc = actionDesc       
                graph.addNode( name )
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
 * Delete entries related to a specific jobId 
 * 
 * @param jobId The jobId to delete:
 *      - remove Store state entries published by the job
 *      - clean up the control metadata related to the job
 */
export let releaseJob = ( jobId: number) => {
    let idxKey: string = 'J' + jobId
    if ( store.index.has( idxKey) ) { 
        store.index.get( idxKey )!.forEach( (val,key) => {
            // TODO: implement this
        })
    }
    else {
        throw new CxError(__filename, 'ctrl.releaseJob ()', 'CTRL-0004',`Cannot find an store index for ${idxKey}`)
    }
}

/**
 * Remove an action from the Ctrl structure
 * 
 * @param actionName Name of the action to be removed
 * @return void Promise
 */
export let removeAction = async( actionName: string ): Promise<void> => {
    //
    // TODO: Handle multiple locks (write read ...)
    //
    if ( store.isRegistered(actionName) ) {
        await store.unregister(actionName)
        graph.removeNode(actionName)
        actions.delete(actionName)
        initCounts.delete(actionName)
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

/**
 * Check whether an action's state is dirty 
 * 
 * @param actionsName The name of the action to check
 * @return true for isDirty, otherwise false 
*/
export let isDirty = ( actionName: string ): boolean => {
    let storeId = store.getStoreId(actionName)
    let children = graph.dependenciesOf(actionName)
    let isDirty = false
    children.forEach( (childKey: string) => { 
        let childStoreId = store.getStoreId(childKey)
        isDirty = ( isDirty || storeId <  childStoreId ) 
        if ( isDirty ) return
    })
    return isDirty
}

/**
 * Build the map of all dependencies 
 * 
 * @param rootName Name of the action
 * @return A Map of Action Descriptors
 */
export let getActionsToRun  = ( rootName: string, jobId: number | void =  jobIdSeq().next().value  ): Map<string, ActionDescriptor> => {
    p.mark('getActionsToRun') // action: rootName
    let actionsToRun = new Map<string, ActionDescriptor>()
    let inversHierarchy  = new Map<string, string>()
    let prevNodeIdent: string[] = []
    if ( graph.hasNode( rootName ) ) { 
        //     
        // iterate through the reverse sorted graph, meaning that you read the leafs first
        //  
        let hierarchy = graph.hierarchyOf( rootName, true )
        hierarchy.forEach( (ident: string, name: string )  => {
            let storeId  = store.has(name) ? store.getStoreId( name ) : -1 
            inversHierarchy.set(ident, name)
            //
            // Match all direct children
            //
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
            let actionDesc = new ActionDescriptor()
            actionDesc.rootName = rootName
            actionDesc.name     = name
            actionDesc.ident    = ident
            actionDesc.storeId  = storeId  // this is the current StoreId before running the action
            actionDesc.children = children
            actionDesc.jobId  = jobId as number
            actionDesc.taskId    = taskIdSeq().next().value as number
            actionsToRun.set(name, actionDesc )
            prevNodeIdent.push(ident)
        });     
    }
    p.mark('getActionsToRun')
    descriptors.set(jobId as number, actionsToRun)
    return actionsToRun
}

/**
 * Build the Promise chain for executing the actionsToRunMap 
 * TODO: also provide an Observables implementation of this
 * 
 * @param actionName  The name of the Action to be executed 
 * @param dirtyOnly If set to true, only run dirty (data is outdated and beed to be updated) actions
 * @returns ActionDescriptorIntf An Action descriptor interface containng a run() funtion that emits a run event for this action chain
 */
export let getPromiseChain = ( actionName: string, runAll: boolean = true ): RunIntf => {
    let jobId = jobIdSeq().next().value as number
    let jobKey: string =  store.addIndexKey( jobId, 'J' )
    
    p.mark( `promiseChain_${jobId}` )
    let actionsToRun = getActionsToRun(actionName, jobId)
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
    actionsToRun.forEach( (actionDesc, key) => {  
        //
        // Handle child nodes that the target node depens on
        // 
        let dependsOn =  new Map<string, Promise<unknown>>()
        //
        // Prevent the leaf nodes from running immediately by making them dependent on 
        // the event promise defined above
        //
        if ( actionDesc.children.length ==  0 ) { 
                dependsOn.set(eventName, eventTrig) 
        }
        else {
            actionDesc.children.forEach( (childKey: string) => {
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
        // Create Promises for the execution tree
        //
        if ( [ ...dependsOn.values() ].length > 0 )  {             
            actionsToRun.get(key)!.promise = Promise.all([ ...dependsOn.values() ] )
            .then( () => {
                return new Promise( async (resolve) => {
                    p.mark(`P_${key}_${actionDesc.jobId}`) 
                    let res = false 
                    let dirty = false
                     /*
                    * Run the actionObject if:
                    * - If object is a runable node and not an artificial non-object added "top node" in the graph
                    * - The object has newer/dirty child objects 
                    * - The runAll flag is set to true
                    * - The object callCount is 0 (firstRun) and the object.meta.init is set to false (the default)
                    */
                    if ( actions.has(key) ) {
                        let actionObj = actions.get(key) as Action<any> 
                        actionObj.currActionDesc = actionDesc
                        let firstRun = ( actionObj.meta.callCount === 0 && actionObj.meta.init === false ) 
                        let dirty = ( isDirty(key) ||  runAll || firstRun )
                        if ( dirty ) {
                            res = await actionObj.__exec__ctrl__function__ (actionDesc)
                            actionDesc.ran = true
                            actionObj.meta.callCount += 1
                        }
                        else { 
                            //
                            // Add to job-index even when action is not dirty/not called
                            //
                            store.index.get(jobKey)!.set( actionDesc.name , store.getStoreId( actionDesc.name ) ) 
                        }
                        actionDesc.isDirty = dirty
                        actionDesc.success  = res || ! dirty                    
                        actionDesc.storeId = store.getStoreId( key, -1 )
                        actionObj.currActionDesc = actionDesc
                    }
                    else {
                        actionDesc.success = true
                        actionDesc.ran = true
                    }
                    p.mark(`P_${key}_${actionDesc.jobId}`, actionDesc)
                    resolve(key)
                })
                .catch( (e)  =>  {
                    $log.error(e)
                })
                .finally ( () => {
                    if ( key === baseKey ) ee.emit( `${eventName}_fin` )
                })
            })
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
                                                ad.ran && ee.emit( `${ad.name}_pub` )
                                            }
                                            resolve() 
                                        })
                                    })
                                }
    }
}

/**
 * Runs all dependencies of a target action in order one by one and then the action itself
 * 
 * @param actionName The name of the action to run
 * @return True if all actions ran successfully, otherwise false
 */
export let runTarget = ( actionName: string, runAll: boolean = false ): Promise<boolean> => {
    let jobId = jobIdSeq().next().value as number
    let jobKey: string =  store.addIndexKey( jobId, 'J' )

    let actionsToRun = getActionsToRun(actionName, jobId) 
    p.mark(`runTarget_${jobId}`) // , actionsToRun.get(actionName)

    let resAll = true
    if ( graph.hasNode( actionName) ) {
        actionsToRun.forEach( async ( actionDesc: ActionDescriptor, name: string ) => {          
            p.mark(`F_${actionDesc.name}_${actionDesc.jobId}`) 
            let actionObj = actions.get( actionDesc.name ) as Action<any>
            let funcName: string = actionObj.meta.funcName as string
            
            try {
                let res = false 
                actionObj.currActionDesc = actionDesc
                let firstRun = ( actionObj.meta.callCount === 0 && actionObj.meta.init === false ) 
                let dirty = ( isDirty(actionDesc.name) ||  runAll || firstRun )
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
                    store.index.get(jobKey)!.set( actionDesc.name , store.getStoreId( actionDesc.name ) ) 
                }
                actionDesc.isDirty = dirty
                actionDesc.success = res || ! dirty
                actionObj.currActionDesc = actionDesc
                resAll = res && resAll? res : false
            }
            catch (err) {
                throw new CxError(__filename, 'runTarget()', 'CTRL-0006', `Failed to run ${actionDesc.name}: ${err}`, err)
            }
            finally {
                p.mark(`F_${actionDesc.name}_${actionDesc.jobId}`, actionDesc )
            }
        })
    }
    else throw new CxError(__filename, 'runTarget()', 'CTRL-0007', `Unknown actionName: ${actionName}`)
      
    p.mark(`runTarget_${jobId}`)
    return Promise.resolve(resAll)         
}
