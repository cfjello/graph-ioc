import { sprintf } from "https://deno.land/std/fmt/printf.ts"
import { ActionConfigType, OptimizerType, SwarmConfiguration, Approach } from "./interfaces.ts"
import { ctrl, Action }  from '../cxctrl/mod.ts'
import { SwarmOptimizer } from "./SwarmOptimizer.ts"
import { bootstrap, Constructor } from "./bootstrap.ts"
import {$log, perf, ee, CxError, _ } from "../cxutil/mod.ts"

const __filename = new URL('', import.meta.url).pathname


/**
 * Set the dependencies of this action
 * 
 * @param conf A Partial SwarmConfiguration
 * @return A SwarmConfiguration with some defaults set
 */
 export let swarmConfigDefaults = ( config: Partial<SwarmConfiguration> ): SwarmConfiguration => {
    let conf = _.clone( config )
    if ( _.isUndefined(conf.swarmSeed) ) conf.swarmSeed = 10
    if ( _.isUndefined(conf.swarmMax)  ) conf.swarmMax  = conf.swarmSeed * 2
    if ( _.isUndefined(conf.approach)  ) {
        conf.approach = 'none' 
    }
    else {
        if ( _.isUndefined(conf.timerInterval) ) conf.timerInterval = 120000
        if ( _.isUndefined(conf.skipFirst)  )    conf.skipFirst     = 1
    }
    if ( _.isUndefined(conf.interval)  ) {
        if ( conf.approach === 'interval' ) {
            conf.interval = Math.round( (conf.swarmMax - conf.swarmSeed) / 10 ) 
            if ( conf.interval < 1  )  conf.interval = 1
        }
        else {
            conf.interval = -1
        }
    }
    return conf
}

/**
 * Set the swarm configuration
 * 
 * @param name Name of the action element
 * @param _conf A Partial SwarmConfiguration
 */
 export let setSwarmConfig = ( key: string, _conf: Partial<SwarmConfiguration> ): void => {
    try {
        let config = swarmConfigDefaults( _conf )
        ctrl.setNodeConfig( key, config )
    }
    catch(err) {
        throw new CxError(__filename, 'setSwarmConfig()', 'CONF-0003', `Failed to set swarm configuration.`,err)
    }  
}

/**
 * Set the swarm configuration, simpler user function
 * 
 * @param name Name of the action element
 * @param _swarmSeed The number of swarm actions to start with for the action element
 * @param _swarmMax The maximum number of swarm actions to start with for the action element
 * @param optimize The optimization approach
 */
export let swarmConfig = ( key: string, _swarmSeed: number,  _swarmMax: number | undefined, approach: Approach = 'binary' ): void  => {
    let swarmSeed = _swarmSeed < 2 ? 0 : _swarmSeed
    let swarmMax = _.isUndefined( _swarmMax ) || ( _swarmMax! < swarmSeed ) ? swarmSeed : _swarmMax
    setSwarmConfig( key, { minimum: swarmSeed, maximum: swarmMax, approach: approach } )
}


export async function addSwarm<T>( actionName: string, actionClass: Constructor<T> , _swarmSize: number = -1,  rewardFunc: Function | undefined = undefined ) {
    try {
        //
        // Get Root object, it's dependencies and the objects swarm configuration
        //
        if ( ! ctrl.actions.has(actionName) ) 
            throw new CxError( __filename, 'addSwarm()', 'CTRL-0011', `No action instance named ${actionName} has been registered.`)

        let rootObj   = ctrl.actions.get(actionName)! // as unknown as Constructor<T>
        let rootName  = rootObj.meta.name!
        let config    = _.omit( ctrl.graph.getNodeData( rootName ), ['jobThreshold']) as SwarmConfiguration

        if ( _swarmSize > config.maximum ) 
            throw new CxError( __filename, 'addSwarm()', 'CTRL-0011', `SwarmSize: ${_swarmSize}, is greater than configuration allows: ${config.maximum}.`)

        let rootDeps: string[]  = ctrl.graph.getOutgoingEdges( rootName )  
        
        //
        // Initialize Swarm array and Swarm size
        //
        // let swarmObjs: Array<typeof rootObj> = [] 
        let swarmSize = _swarmSize > config.minimum && _swarmSize <= config.maximum ? _swarmSize: config.minimum
        //
        // Setup the swarm interface and optimizer reward function
        // 
        rootObj.swarm = {
            swarmName:      rootObj.meta.name,
            canRun:         true,
            canBeDisposed:  false,
            swarmLsnr:      undefined,
            reward:         (val: number) => { }, 
            optimizer:      undefined,
            children:       []
        } 
        rootObj.swarm!.optimizer = new SwarmOptimizer( _.omit( config,  ['jobThreshold']), rootObj ) 

        let names: string[] = []
        //
        // Bootstrap new action object instances from the root object and add them to ctrl.actions
        // 
        for( let i = 0; i < swarmSize; i++ ) {
            //
            // Create and add new swarm object
            //
            names[i] =  sprintf("%s_swarm_%04d", actionName, i);
            ctrl.graph.addNode( names[i] )
            let actionConfig: ActionConfigType<T> = { name: rootName, swarmName: names[i]!, init: false, state: rootObj.state } 
            ctrl.actions.set( names[i], await bootstrap( actionClass as unknown as Constructor<T> , actionConfig ) as unknown as Action<T> )
            //
            // Configure the new and the root objects
            //
            ctrl.actions.get( names[i] )!.setDependencies( ...rootDeps )
            rootObj.swarm!.children!.push( names[i] )
        }
        let rootNodeData: OptimizerType  = ctrl.graph.getNodeData( actionName )
        rootNodeData.swarmChildren = _.clone( rootObj.swarm!.children )
        ctrl.graph.setNodeData( actionName, rootNodeData )
    }
    catch(err) {
        throw new CxError( __filename, 'addSwarm()', 'SWARM-0005', `Failed to build swarm.`, err )
    }
}

export async function removeSwarm<T>( actionName: string ) { // TODO: DO the testing
    try {
        if ( ! ctrl.actions.has(actionName) ) 
            throw new CxError(__filename, 'removeSwarm()', 'SWARM-0006', `No action instance named ${actionName} is registered.`)
        //
        // Get objects
        //
        let rootObj   = ctrl.actions.get(actionName)!
        // let rootName  = rootObj.meta.storeName

        if ( ! rootObj.isMaster() ) throw new CxError(__filename, 'removeSwarm()', 'CTRL-0012', `${actionName} is not a swarmMaster instance`)
        rootObj.swarm!.children!.forEach( (swarmInstName, idx ) => {
            ctrl.removeAction( swarmInstName )
        })   
        rootObj.swarm!.children = []
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

        if ( ! rootObj.isMaster() ) throw new CxError(__filename, 'removeSwarm()', 'CTRL-0012', `${actionName} is not a swarmMaster instance`)
        let lastChild = rootObj.swarm!.children.length -1
        if ( lastChild > 0  ) {
            ctrl.removeAction( rootObj.swarm!.children![lastChild] )
            rootObj.swarm!.children!.pop()
        }  
    }
    catch(err) {
        throw new CxError(__filename, 'removeSwarm()', 'SWARM-0008', `Failed to remove swarm member due to: ${err}`)
    }
}

/*
export function optimizerFactory(_config: Partial<NodeConfiguration>) { 
    let config = swarmConfigDefaults(_config)
    let rewardValues      = new Array<number>()
    let intervalTimer     = performance.now()
    let rewardSeq: number = 0
    let rewardValue       = 0 
    return ( val: number ) => { 
            try {
                let currentTimer = performance.now()
                rewardValue += val 
                if ( (currentTimer - intervalTimer) > config.timerInterval! ) {
                    console.log( `NUM of ROWS: ${rewardValue}`)
                    rewardValues.push( rewardValue )
                    intervalTimer = currentTimer
                    rewardValue = 0
                }
            }
            catch ( err ) {
                throw new CxError(__filename, 'removeSwarm()', 'SWARM-0021', `Failed to remove swarm member.`, err)
            }
        }
}
*/