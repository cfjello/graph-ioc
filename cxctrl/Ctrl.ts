import {CxGraph} from "https://raw.githubusercontent.com/cfjello/cxgraph/master/mod.ts"
import * as _store  from "../cxstore/CxStore.ts"
import {$log, perf, $plog} from "../cxutil/mod.ts"
import {ActionDescriptor, ActionDescriptorIntf, ActionConfigType} from "./interfaces.ts"
import { Action } from './Action.ts'
import EventEmitter from "https://deno.land/x/event_emitter/mod.ts"
// import "reflect-metadata" 


// logger.disableConsole();

/*
process.on('unhandledRejection', (reason) => {
    $log.error('Reason: ' + reason);
});
*/ 

//
// Event emitter for starting execution of promise trees
// 
export let ee = new EventEmitter()
export let store = _store

//
// Simple Performance logger instance
//
export let p = perf

/**
 * The Ctrl transaction Ids 
 */
let idNum: number = 0
export function* ctrlId() {
    while(true) {
        yield idNum++;
    }
}

/**
 * The Ctrl transaction sequence Id 
 */
let idSeq: number = 0
export function* ctrlSeq() {
    while(true) {
        yield idSeq++;
    }
}

// let   id: number  = 1
// export let store: CxStore  = new CxStore($log)
export let graph: CxGraph  = new CxGraph()
export let actions         = new Map<string, Action<any>>() 
//
// Store Functions
// 
/**
 * Publish changes to the state of an action
 * 
 * @param action The action instance that want to publish
 */
export let publish = async ( action: Action<any> ): Promise<void> => { 
        // $log.debug(`PUBLISH: ${name} = ${JSON.stringify(context) }`)
        await store.set( action.name, action.state ) 
}

/**
 * Get the state for a named action
 * 
 * @param name Name of the action
 * @param idx The index of the state, where the default value (-1) gives you newest state 
 */
export let  getState = (name:string, idx: number = -1): any =>  store.get(name, idx)

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
 * Add an action to the Graph based IoC System
 * 
 * @param action Add an action to the Ctrl set of actions:
 *      - register the data structure (the state) in the store
 *      - add the action to the graph structure
 */
export let addAction = async ( action: Action<any>, decoratorCall: number = 0 ): Promise<void> => {
    if ( ! store.isRegistered( action.name ) && decoratorCall == 1) {
        perf.mark( 'addAction', { action: action.name})
        graph.addNode(action.name)
        try {
            await store.register(action.name, action.state).then(() => {              
                // graph.addNode(action.name)
                actions.set(action.name, action)
                perf.mark( 'addAction',  { action: action.name, state: action.state } )
                console.log(`Adding Action and graph Node: ${action.name} with __cnt__: ${decoratorCall}`)   
            })
        }
        catch (err) {
            perf.mark( 'addAction',  { action: action.name, state: action.state } )
            $plog.debug('Flushing the performence info')
        }
    }
    else {
        // storeId = store.getStoreId( action.name ) 
        // $log.info( `Compare storeIds: ${storeId} and ${action._storeId}` )
        if ( decoratorCall == 0) {
            throw Error("Action " + action.name + " is already registred in the Store  - call ctrl.removeAction to remove it first")
        }    
    }
}

/**
 * Remove an action from the Ctrl structure
 * 
 * @param actionName Name of the action to be removed
 * @return Success or failure in a boolean
 */
export let removeAction = async( actionName: string ): Promise<void> => {
    if ( store.isRegistered(actionName) ) {
        await store.unregister(actionName)
        graph.removeNode(actionName)
        actions.delete(actionName)
    }
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
    // store.setLatches([actionName, ...children])
    let isDirty = false
    children.forEach( (childKey: string) => { 
        let childStoreId = store.getStoreId(childKey)
        isDirty = ( isDirty || storeId <  childStoreId ) 
    })
    return isDirty
}

/**
 * Build the map of all dependencies that are dirty and returns 
 * 
 * @param actionName Name of the action
 * @return A Map of Action Descriptors
 */
export let getActionsToRun  = ( actionName: string ): Map<string, ActionDescriptor> => {
    p.mark('getActionsToRun', { action: actionName} )
    let actionsToRun = new Map<string, ActionDescriptor>()
    let inversHierarchy  = new Map<string, string>()
    let prevNodeIdent: string[] = []
    if ( graph.hasNode( actionName ) ) { 
        //     
        // iterate through the reverse sorted graph 
        //  
        let hierarchy = graph.hierarchyOf( actionName, true )
        hierarchy.forEach( (currIdent: string, key: string )  => {
            let storeId  = store.getStoreId( key )
            inversHierarchy.set(currIdent, key)
            //
            // Match all direct children
            //
            let childIdents: string[] = prevNodeIdent.filter( child => {
                let parent = child.substr(0, child.lastIndexOf('.') ) 
                return  parent === currIdent
            }) 
            //
            // Build Array of children
            //
            let children: string[] = []
            childIdents.forEach( childIdent => { 
                children.push( inversHierarchy.get( childIdent )! ) 
            })
            //
            // Set the action Descriptor
            //
            let actionDesc : ActionDescriptor =  { name: key , ident: currIdent, storeId: storeId, children: children}
            actionsToRun.set(key, actionDesc )
            prevNodeIdent.push(currIdent)
        });     
    }
    p.mark('getActionsToRun')
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
export let getPromiseChain = ( actionName: string, runAll: boolean = true ): ActionDescriptorIntf => {
    let transaction = ctrlId().next().value
    // let desc = { transaction: transaction } 
    p.mark("promiseChain",  { transaction: transaction, seq: ctrlSeq().next().value} ) 

    let actionsToRun = getActionsToRun(actionName)
    //
    // Create an initial promise that listens for a triggering event, 
    // allowing us to control when the whole transaction chain of promises are activated
    //
    let baseKey = [... actionsToRun.keys()].reverse()[0]
    let eventName: string =  `${baseKey}_Event_${transaction}`
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
        // Prevent leaf nodes from running immediately by making them dependent on 
        // the event promise defined above
        if ( actionDesc.children.length ==  0 ) { 
                dependsOn.set(eventName, eventTrig) 
        }
        else {
            actionDesc.children.forEach( (childKey ) => {
                dependsOn.set(childKey, actionsToRun.get(childKey)!.promise!)
            })
        }
        //
        // Create Promises for the execution tree
        //
        if ( [ ...dependsOn.values() ].length > 0 )  {             
            actionsToRun.get(key)!.promise = Promise.all([ ...dependsOn.values() ] ).then( () => {
                return new Promise( async (resolve, reject) => {  
                    let res = false 
                    let dirty = false
                    try {
                        let desc = { transaction: transaction, seq: ctrlSeq().next().value, ran: false, success: false}
                        p.mark('P_' + key, desc);
                        if ( (dirty = isDirty(key) || runAll ) ) {
                            let actionObj = actions.get(key) as Action<any>
                            let funcName: string = actionObj.funcName
                            res = await (actionObj as any)[funcName]()
                        }
                        desc.ran      = dirty || runAll
                        desc.success  = res || ! dirty
                        p.mark('P_' + key, desc)
                        resolve(key)
                    }
                    catch(e) {
                        $log.error(e.stack)
                        reject(e)
                    }
                })
            })
        }         
    })
    p.mark("promiseChain") 
    return {
        getActionsToRun(): Map<string,ActionDescriptor>  { return actionsToRun },
        getPromise():      Promise<unknown> { return actionsToRun.get(baseKey)!.promise! },
        run():             void { ee.emit( eventName ) }
    }
}

/**
 * Runs all syncronious dependencies of a target action and then the action itself
 * 
 * @param actionName The name of the action to run
 * @return True if all actions ran successfully, otherwise false
 */
export let runTarget = ( actionName: string ): boolean => {
    let transaction = ctrlId().next().value
    let desc = { transaction: transaction }
    
    p.mark("runTarget", desc )

    let resAll = true
    if ( graph.hasNode( actionName) ) {
        let actionList = getActionsToRun(actionName)
        for ( let action of  actionList.keys() ) {
            let res = false 
            p.mark(`F_${action}`,  desc ) 
            let actionObj = actions.get(action) as Action<any>
            let funcName: string = actionObj.funcName
            res = (actionObj as any)[funcName]()  // call it
            p.mark(`F_${action}`,  { transaction: desc.transaction, seq: ctrlSeq().next().value,  ran: true, success: res } )
            resAll = ( res == true ) ? resAll : false
        }
    }
    else throw Error(`ctrl.runTarget() - unknown actionName: ${actionName}`) 
      
    p.mark("runTarget")

    return resAll         
}

/*
export let ping = () => {
    $log.info('Ctrl ping')
}

 TODO: refactor this
export let runDependants = ( actionName: string ): boolean => {
        let resAll = true
        if ( graph.hasNode( actionName) ) {
            let actionList = graph.dependantsOf(actionName)
            for ( let action of  actionList ) {
                // $log.debug(`RUN: ${action}`)
                let res = callFunctionByAction( actions[action] as Action<any> )
                resAll = ( res == true ) ? resAll : false
            }
        }
        else throw Error(`ctrl.Dependants() - unknown actionName: ${actionName}`)  
        return resAll
    }
*/