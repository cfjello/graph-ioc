import { sprintf } from "https://deno.land/std/fmt/printf.ts"
import { ctrl, Action }  from '../cxctrl/mod.ts'
import { bootstrap, Constructor } from "./bootstrap.ts"
// import { graph, actions } from "./Ctrl.ts"
import { ActionConfigType, NodeConfiguration } from "./interfaces.ts"
import {$log, perf, ee, CxError, _ } from "../cxutil/mod.ts"
const __filename = new URL('', import.meta.url).pathname

// 
// Treshold and Swarm setters and functions
// 
export let setThreshold = ( key: string, _threshold: number )  => {
    let threshold = _threshold < 2 ? -1 : _threshold
    try {
        setNodeConfig( key, { jobThreshold: threshold } )
    }
    catch(err) {
        throw new CxError( __filename, 'setThreshold()', 'CTRL-0009', `Failed to set jobThreshold due to: ${err}` )
    }
}

export let setNodeConfig = ( key: string, config: Partial<NodeConfiguration> ) => {
    if ( ! ctrl.graph.hasNode(key) ) 
        throw new CxError(__filename, 'setNodeConfig()', 'SWARM-0002', `The graph has no node with id: ${key}`)
    else {
        let currConfig = ctrl.graph.getNodeData(key)
        ctrl.graph.setNodeData( key, _.merge(currConfig, config) )
    }
}

export let setSwarmConf = ( key: string, _swarm: number,  _swarmMax: number | undefined )  => {
    let swarmSeed = _swarm < 2 ? 0 : _swarm
    let swarmMax = _.isUndefined( _swarmMax ) || ( _swarmMax! < swarmSeed ) ? swarmSeed : _swarmMax
    try {
        setNodeConfig( key, { swarmSeed: swarmSeed, swarmMax: swarmMax })
    }
    catch(err) {
        throw new CxError(__filename, 'setSwarm()', 'SWARM-0003', `Failed to set swarmCount.`,err)
    }
}

export async function addSwarm<T>( actionName: string, actionClass: Constructor<T>, _swarmSize: number = -1 ) { 
    try {
        //
        // Get objects
        //
        if ( ! ctrl.actions.has(actionName) ) throw new CxError( __filename, 'addSwarm()', 'CTRL-0011', `No action instance named ${actionName} has been registered.`)

        let rootObj             = ctrl.actions.get(actionName)! // as unknown as Constructor<T>
        let rootName            = rootObj.meta.name!
        let rootDeps: string[]  = ctrl.graph.getOutgoingEdges( rootName )
        let config              = ctrl.graph.getNodeData( rootName ) as NodeConfiguration
        //
        // Initialize
        //
        let swarmObjs: Array<typeof rootObj> = [] 
        let swarmSize = _swarmSize > config.swarmSeed && _swarmSize <= config.swarmMax ? _swarmSize: config.swarmSeed

        if ( _.isUndefined( (rootObj as unknown as Action<T>).swarm.children) ) {
            rootObj.swarm.children = [] as string[]
        }
        else {
            throw new CxError(__filename, 'addSwarm()', 'SWARM-0004', `Instance $actionName already have a Swarm, use removeSwarm() first.`)
        }
        let names: string[] = []
        //
        // Bootstrap new action object instances and add them to ctrl
        // 
        for( let i = 0; i < swarmSize; i++ ) {
            //
            // Create new object
            //
            names[i] =  sprintf("%s_swarm_%04d", actionName, i);
            ctrl.graph.addNode( names[i] )
            let actionConfig: ActionConfigType<T> = { name: rootName, swarmName: names[i]!, init: false, state: rootObj.state } 
            ctrl.actions.set( names[i], await bootstrap( actionClass, actionConfig ) as unknown as Action<T> )
            //
            // Configure the new and the root objects
            //
            ctrl.actions.get( names[i] )!.setDependencies( ...rootDeps )
            rootObj.swarm.children!.push( names[i] )
        }
        let rootNodeData: NodeConfiguration  = ctrl.graph.getNodeData( actionName )
        rootNodeData.swarmChildren = _.clone( rootObj.swarm.children )
        ctrl.graph.setNodeData( actionName, rootNodeData )
    }
    catch(err) {
        throw new CxError( __filename, 'addSwarm()', 'SWARM-0005', `Failed to build swarm.`, err )
    }
}

export async function removeSwarm<T>( actionName: string ) { 
    try {
        if ( ! ctrl.actions.has(actionName) ) 
            throw new CxError(__filename, 'removeSwarm()', 'SWARM-0006', `No action instance named ${actionName} is registered.`)
        //
        // Get objects
        //
        let rootObj   = ctrl.actions.get(actionName)!
        // let rootName  = rootObj.meta.storeName

        if ( ! rootObj.swarm.isMaster() ) throw new CxError(__filename, 'removeSwarm()', 'CTRL-0012', `${actionName} is not a swarmMaster instance`)
        rootObj.swarm.children!.forEach( (swarmInstName, idx ) => {
            ctrl.removeAction( swarmInstName )
        })   
        rootObj.swarm.children = []
    }
    catch(err) {
        throw new CxError(__filename, 'removeSwarm()', 'SWARM-0007', `Failed to remove swarm due to: ${err}`)
    }
}


export async function removeSwarmMember<T>( actionName: string ) { 
    try {
        if ( ! ctrl.actions.has(actionName) ) 
            throw new CxError(__filename, 'removeSwarm()', 'SWARM-0006', `No action instance named ${actionName} is registered.`)
        //
        // Get objects
        //
        let rootObj   = ctrl.actions.get(actionName)!
        // let rootName  = rootObj.meta.storeName

        if ( ! rootObj.swarm.isMaster() ) throw new CxError(__filename, 'removeSwarm()', 'CTRL-0012', `${actionName} is not a swarmMaster instance`)
        let lastChild = rootObj.swarm.children!.length -1
        if ( lastChild > 0  ) {
            ctrl.removeAction( rootObj.swarm.children![lastChild] )
            rootObj.swarm.children!.pop()
        }  
    }
    catch(err) {
        throw new CxError(__filename, 'removeSwarm()', 'SWARM-0008', `Failed to remove swarm member due to: ${err}`)
    }
}


