import { sprintf } from "https://deno.land/std/fmt/printf.ts"
import { ctrl, Action }  from '../cxctrl/mod.ts'
import { bootstrap, Constructor } from "./bootstrap.ts"
// import { graph, actions } from "./Ctrl.ts"
import { NodeConfiguration } from "./interfaces.ts"
import {$log, perf, ee, CxError, _ } from "../cxutil/mod.ts"
const __filename = new URL('', import.meta.url).pathname

// 
// Treshold and Swarm setters and functions
// 
export let setThreshold = ( key: string, _threshold: number )  => {
    let threshold = _threshold < 2 ? -1 : _threshold
    try {
        setNodeConfig( key, { jobThreshold: threshold })
    }
    catch(err) {
        throw new CxError(__filename, 'setThreshold()', 'CTRL-0008', `Failed to set jobThreshold due to: ${err}`)
    }
}

export let setNodeConfig = ( key: string, config: Partial<NodeConfiguration> ) => {
    if ( ! ctrl.graph.hasNode(key) ) 
        throw new CxError(__filename, 'setNodeConfig()', 'CTRL-0009', `The graph has no node with id: ${key}`)
    else {
        let currConfig = ctrl.graph.getNodeData(key)
        ctrl.graph.setNodeData(key, _.merge(currConfig, config))
    }
}

export let setSwarmConf = ( key: string, _swarm: number,  _swarmMax: number | undefined )  => {
    let swarmSeed = _swarm < 2 ? 0 : _swarm
    let swarmMax = _.isUndefined( _swarmMax ) || ( _swarmMax! < swarmSeed ) ? swarmSeed : _swarmMax
    try {
        setNodeConfig( key, { swarmSeed: swarmSeed, swarmMax: swarmMax })
    }
    catch(err) {
        throw new CxError(__filename, 'setSwarm()', 'CTRL-0010', `Failed to set swarmCount due to: ${err}`)
    }
}

export async function addSwarm<T>(actionName: string, _swarmSize: number = -1 ) { 
    try {
        //
        // Get objects
        //
        if ( ! ctrl.actions.has(actionName) ) throw new CxError(__filename, 'addSwarm()', 'CTRL-0011', `No action instance named ${actionName} has been registered.`)

        let rootObj             = ctrl.actions.get(actionName)! // as unknown as Constructor<T>
        let rootName            = rootObj.meta.name!
        let rootDeps: string[]  = ctrl.graph.getIncomingEdges(rootName)
        let config              = ctrl.graph.getNodeData( rootName ) as NodeConfiguration
        //
        // Initialize
        //
        let swarmObjs: Array<typeof rootObj> = [] 
        let swarmSize = _swarmSize > config.swarmSeed && _swarmSize <= config.swarmMax ? _swarmSize: config.swarmSeed

        if ( _.isUndefined( (rootObj as unknown as Action<T>).meta.swarmChildren) )  {
            (rootObj as unknown as Action<T>).meta.swarmChildren = [] as string[]
        }
        else {
            throw new CxError(__filename, 'addSwarm()', 'CTRL-0012', `Instance $actionName already have a Swarm, use removeSwarm() first.`)
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
            let obj = await bootstrap( rootObj as unknown as Constructor<T>, {name: rootName, init: false, state: rootObj.state } );
            //
            // Configure new and root objects
            //
            (obj as unknown as Action<T>).meta.swarmName = names[i];
            (obj as unknown as Action<T>).setDependencies(...rootDeps);
            (rootObj as unknown as Action<T>).meta.swarmChildren?.push(names[i])
            //
            // Add the new object to ctrl.actions
            // 
            ctrl.actions.set( names[i], obj as unknown as Action<T>)
        }
        (rootObj as unknown as Action<T>).setDependencies(...names)
        // rootObj as unknown as Action<T>).
    }
    catch(err) {
        throw new CxError(__filename, 'addSwarm()', 'CTRL-0013', `Failed to build swarm.`, err)
    }
}

export async function removeSwarm<T>(actionName: string ) { 
    try {
        if ( ! ctrl.actions.has(actionName) ) throw new CxError(__filename, 'removeSwarm()', 'CTRL-0011', `No action instance named ${actionName} is registered.`)
        //
        // Get objects
        //
        let rootObj   = ctrl.actions.get(actionName)!
        // let rootName  = rootObj.meta.name

        if ( ! rootObj.isSwarmMaster() ) throw new CxError(__filename, 'removeSwarm()', 'CTRL-0012', `${actionName} is not a swarmMaster instance`)
        rootObj.meta.swarmChildren!.forEach( (swarmInstName, idx ) => {
            ctrl.removeAction( swarmInstName )
        })   
        rootObj.meta.swarmChildren = []
    }
    catch(err) {
        throw new CxError(__filename, 'swarm()', 'CTRL-0014', `Failed to build swarm due to: ${err}`)
    }
}
