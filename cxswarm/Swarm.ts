import { sprintf } from "https://deno.land/std/fmt/printf.ts"
import { ConfigMetaType, ActionConfigType } from "../cxctrl/interfaces.ts"
import { OptimizerType,  SwarmConfiguration, SwarmChildType, SwarmMasterType, SwarmOptimizerType, Approach, Advice, OptimizerCallback  } from "./interfaces.ts"
import { ctrl, Action }  from '../cxctrl/mod.ts'
import { config } from "../cxconfig/mod.ts"
import { NodeConfiguration } from "../cxconfig/interfaces.ts"
import { SwarmOptimizer} from "./SwarmOptimizer.ts"
import { bootstrap, Constructor } from "../cxctrl/bootstrap.ts"
import {$log, perf, ee, CxError, _ } from "../cxutil/mod.ts"

const __filename = new URL('', import.meta.url).pathname

/**
 * Set the dependencies of this action
 * 
 * @param conf A Partial SwarmConfiguration
 * @return A SwarmConfiguration with some defaults set
 */
 export let swarmConfigDefaults = ( _conf: Partial<SwarmConfiguration> ): SwarmConfiguration => {
    let conf = _.clone( _conf )
    if ( _.isUndefined(_conf.minimum) ) _conf.minimum = 10
    if ( _.isUndefined(_conf.maximum)  ) _conf.maximum  = _conf.minimum! * 2
    if ( _.isUndefined(_conf.approach)  ) {
        _conf.approach = 'binary' 
    }
    else {
        if ( _.isUndefined(_conf.timerMS) ) _conf.timerMS = 120000
        if ( _.isUndefined(_conf.skipFirst)  )    _conf.skipFirst     = 1
    }
    if ( _.isUndefined(_conf.interval)  ) {
        if ( _conf.approach === 'interval' ) {
            _conf.interval = Math.round( (_conf.maximum! - _conf.minimum!) / 10 ) 
            if ( _conf.interval < 1  )  _conf.interval = 1
        }
        else {
            _conf.interval = -1
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
        let conf = swarmConfigDefaults( _conf ) 
        config.setNodeConfig(key, conf )
    }
    catch(err) {
        throw new CxError(__filename, 'setSwarmConfig()', 'CONF-0003', `Failed to set swarm configuration.`,err)
    }  
}

/**
 * Set the swarm configuration, simpler user function
 * 
 * @param name Name of the action element
 * @param _minimum The number of swarm actions to start with for the action element
 * @param _maximum The maximum number of swarm actions to start with for the action element
 * @param optimize The optimization approach
 */
export let swarmConfig = ( key: string, _minimum: number,  _maximum: number | undefined, approach: Approach = 'binary' ): void  => {
    let minimum = _minimum < 2 ? 0 : _minimum
    let maximum = _.isUndefined( _maximum ) || ( _maximum! < minimum ) ? minimum : _maximum
    setSwarmConfig( key, { minimum: minimum, maximum: maximum, approach: approach } )
}


export function setSwarmCtrl( 
    actionObj: Action<any>, 
    swarmType: 'child' | 'master' | 'optimizer', 
    confMeta: ConfigMetaType | undefined  = undefined 
    ) 
{
    try {
        if ( swarmType === 'child' && _.isUndefined( confMeta?.swarmName) ) 
            throw new CxError( __filename, 'setSwarmCtrl()', 'SWARM-0000', `SwarmType is "child" and Action config or config.SwarmName is undefined:`)
        //
        // Swarm Base
        //
        if ( ! actionObj.swarm.init ) {
            const _swarmName: string = confMeta?.swarmName ? confMeta.swarmName! : actionObj.meta.name!
            actionObj.swarm = {
                init:           true,
                swarmName:      _swarmName,
                canRun:         true,
                canBeDisposed:  false,
                swarmLsnr:      ee.on( `${_swarmName}_msg`, 
                                    (msg: string): void => { 
                                        // console.log(`Event: ${instance.swarm.swarmName}_msg, MSG: ${msg}`)
                                        if ( msg === 'stop' )
                                            actionObj.swarm.canRun = false 
                                        else if ( msg === 'start' ) 
                                            actionObj.swarm.canRun = true 
                                    }
                                ),
                reward: ( value: number, optimizerName: string = 'swarm', swarmName: string = _swarmName ): void => { 
                    ee.emit(`${actionObj.meta.name!}_reward`, `${actionObj.meta.name}`, value, optimizerName, swarmName )
                },
            } as SwarmChildType
        }
        console.log ( `${JSON.stringify(actionObj.swarm, undefined, 2)}`)

        if ( actionObj.isSwarmMaster() && ( swarmType === 'master' || swarmType === 'optimizer') ) {
            //
            // Swarm Master
            //
            if ( ! (actionObj.swarm as SwarmMasterType).children )
                (actionObj.swarm as SwarmMasterType).children =  [] as string[]
            
            if ( swarmType = 'optimizer') {
                //
                // Swarm Optimizer
                //
                if ( ! ( actionObj.swarm as SwarmOptimizerType).optimizers ) {
                    //
                    // Initialize
                    //
                    ( actionObj.swarm as SwarmOptimizerType).optimizers = new Map<string, SwarmOptimizer>();
                    ( actionObj.swarm as SwarmOptimizerType).callbacks  = new Map<string, OptimizerCallback>();
                    //
                    // create default 'swarm' onAdvice event
                    // 
                    const callbackPrefix: string   = `${actionObj.meta.name}_callback`;
                    ( actionObj.swarm as SwarmOptimizerType).onAdvice = ee.on(`${actionObj.meta.name}_advice`, ( name: string ) => { 
                        // let fullName   = `${optimizerPrefix}_${name}`
                        let advices = ( actionObj.getState( name ) as unknown as OptimizerType).advices
                        let callbackName   = `${callbackPrefix}_${name}`
                        if ( (actionObj.swarm as SwarmOptimizerType).callbacks && (actionObj.swarm as SwarmOptimizerType).callbacks.has(callbackName) ) {
                            (actionObj.swarm as SwarmOptimizerType).callbacks.get(callbackName)!(advices, actionObj)
                        }
                        else {
                            throw new CxError(__filename, 'onAdvice()', 'OPTI-0005', `Missing optimizer callback: ${callbackName}` )
                        }
                    })
               
                //
                // Overwrite the child reward function with master reward function
                // 
                const optimizerPrefix: string   = `${actionObj.meta.name}_optimizer`;
                ( actionObj.swarm as SwarmOptimizerType).onReward = ee.on(
                    `${actionObj.meta.name}_reward`, 
                    ( targetName: string, value: number, optimizerName: string , swarmName: string ): void => { 
                        try {
                            console.log( `Into onReward: ${value}`)
                            let actionObj = ctrl.actions.get(targetName)!
                            let fullName   = `${optimizerPrefix}_${optimizerName}`
                            if ( ( actionObj.swarm as SwarmOptimizerType).optimizers.has(fullName) ) {
                                let optimizer = ( actionObj.swarm as SwarmOptimizerType).optimizers.get(fullName)!
                                optimizer.reward(value, optimizerName)
                            }
                            else Error(`no Optimizer named: ${fullName}`)
                        }
                        catch(err) {
                            throw new CxError(__filename, 'onReward()', 'OPTI-0006', `Failed to handle reward from ${swarmName} for optimizer ${optimizerName} on target ${targetName}`, err )
                        }
                        
                    })
                }
            }
        }
    }
    catch( err ) {
        throw new CxError( __filename, 'setSwarmCtrl()', 'SWARM-0001', `Failed to initialize the swarm`, err)
    }
}

function evalSwarmCount( 
    actionName: string, 
    addCount: number
    ) : number
{
    try {
        if ( ! ctrl.actions.has(actionName) ) 
            throw new CxError(__filename, 'evalSwarmCount()', 'SWARM-0003', `No action instance named ${actionName} is registered.`)

        let rootObj = ctrl.actions.get(actionName)!
        let conf  = config.nodeConfig.get(actionName)!

        if ( ! rootObj.swarm.init )  {
            //
            // First time in - Check addCount against the configuration defaults
            // 
            let conf    = _.omit( config.nodeConfig.get( actionName ), ['jobThreshold']) as SwarmConfiguration
            if ( addCount === 0 )
                addCount = conf.minimum  // default to the configuration
            if ( addCount > conf.maximum ) 
                throw new CxError( __filename, 'addSwarm()', 'SWARM-0001', `SwarmSize: ${addCount}, is greater than configuration allows: ${conf.maximum}.`)
        }
        else {
            //
            // Update to the instance count - Check current + update against the configuration defaults
            // 
            if ( ! rootObj.isSwarmMaster() ) {
                // console.log(`Object Name: ${rootObj.meta.name}`)
                // console.log(`${JSON.stringify(rootObj.swarm, undefined, 2)}`)
                throw new CxError(__filename, 'evalSwarmCount()', 'SWARM-0004', `${actionName} is not a swarmMaster instance`)
            }
            let currChildCount  = (rootObj.swarm as SwarmMasterType)?.children?.length ?? 0 
            let newSwarmCount   =  currChildCount === 0 && addCount < conf.minimum ? conf.minimum : addCount
            addCount = currChildCount + newSwarmCount

            if ( addCount < conf.minimum || addCount > conf.minimum ) 
                throw new CxError(__filename, 'evalSwarmCount()', 'SWARM-0006', `${addCount} is out of range: ${conf.minimum} - ${conf.maximum}`)
        }
        return addCount
    }
    catch(err) {
        throw new CxError( __filename, 'evalSwarmCount()', 'SWARM-0007', `Failed to build swarm.`, err )
    }
}

export async function addSwarm<T>( 
    actionName: string, 
    addCount: number = 0
    ) {
    try {    
        let rootObj     = ctrl.actions.get(actionName)!
        let actionClass = Object.getPrototypeOf(rootObj).constructor
        let rootName    = rootObj.meta.name!  
        
        let newCount = evalSwarmCount( actionName, addCount ) 

        let rootDeps: string[]  = ctrl.graph.getOutgoingEdges( rootName )  
        //
        // Setup the swarm interface and optimizer reward function
        //
        setSwarmCtrl( rootObj, 'master', config.nodeConfig.get(actionName)! )

        let childCount = (rootObj.swarm as SwarmMasterType).children.length 
        // let newCount = childCount + addCount
        // if ( newCount < conf.minimum  ) newCount = conf.minimum 

        //
        // Bootstrap new action object instances from the root object and add them to ctrl.actions
        // 
        for( let i = childCount; i < newCount ; i++ ) {
            //
            // Create and add new swarm object
            //
            let name = sprintf("%s_swarm_%04d", actionName, i)
            ctrl.graph.addNode( name )
            let actionConfig: ActionConfigType<T> = { name: rootName, swarmName: name, init: false, state: rootObj.state } 
            ctrl.actions.set( name, await bootstrap( actionClass as unknown as Constructor<T> , actionConfig ) as unknown as Action<T> )
            //
            // Configure the new and the root objects
            //
            ctrl.actions.get(name)!.setDependencies( ...rootDeps );
            (rootObj.swarm as SwarmMasterType).children.push( name )
        }
    }
    catch(err) {
        throw new CxError( __filename, 'addSwarm()', 'SWARM-0002', `Failed to add the swarm.`, err )
    }
}

export async function addOptimizer( 
    rootObj: Action<any>,  
    name: string = 'swarm', 
    callback:  OptimizerCallback | undefined = undefined
    ) 
{
    try {
        let rootName: string = rootObj.getName() 
        //
        // Validation
        //
        if ( ! rootObj.isSwarmMaster() ) 
            throw new CxError( __filename, 'addOptimizer()', 'OPTI-0004', `Object ${name} is not a swarm master object.`)
        if ( !  config.nodeConfig.has(rootName) ) 
            throw new CxError( __filename, 'addOptimizer()', 'OPTI-0005', `Object ${name} has no Swarm configuration.`)
        
        let conf = config.nodeConfig.get(rootName)! 
        let storeName = `${rootObj.meta.name}_optimize_${name}`

        setSwarmCtrl(rootObj, 'optimizer', conf)

        if ( ! conf.approach ) 
            throw new CxError( __filename, 'addOptimizer()', 'OPTI-0006', `addOptimizer ${name} to create optimizer for config: ${JSON.stringify(conf, undefined,2)}`);

        if ( (rootObj.swarm as SwarmOptimizerType).optimizers.has(storeName ) )
            throw new CxError( __filename, 'addOptimizer()', 'OPTI-0007', `addOptimizer storeName ${storeName} for ${name} allready exists - delete the existing optimizer first`);
        //
        // Create optimizer
        //
        if ( _.isUndefined(conf.jobThreshold) ) config.setThreshold( rootName, 5 ); // Default for optimizers

        (rootObj.swarm as SwarmOptimizerType).optimizers!.set( storeName, await new SwarmOptimizer( _.omit( conf, ['jobThreshold'] ) , rootObj.meta.name! ).register(storeName) )

        let callbackName = `${rootName}_callback_${name}`
        if ( name == 'swarm' && !  callback ) { // Add a default callback for the number of swarm objects
            
            (rootObj.swarm as SwarmOptimizerType).callbacks.set(callbackName, function ( advices: Advice[], actionObj: Action<any>  ) { 
                let idx = advices.length -1
                let last = advices[ idx ]
                let nextToLast = advices[ idx -1 ] ?? { done: false , advice: last.advice -1, reward: last.reward -1 }
                if ( ! last.done && nextToLast.advice !== last.advice ) {
                    let children = (rootObj.swarm as SwarmOptimizerType).children
                    if ( last.advice !== children.length ) {
                        // Add Swarm objects
                        let add = last.advice - children.length
                        updateSwarm(rootObj.meta.name!, add)
                    }
                }
            }) 
        }
        else if ( callback ) {
            (rootObj.swarm as SwarmOptimizerType).callbacks!.set(callbackName, () => callback ) 
        }
        else {
            throw new CxError( __filename, 'addOptimizer()', 'OPTI-0009', `${name} optimizer ${callbackName} has no callback function - please provide one when adding the optimizer`)
        }

        (rootObj.swarm as SwarmOptimizerType).onAdvice = ee.on( `${storeName}_advice`, (name: string) => {
            let advices = (ctrl.runState.get(`${storeName}`) as OptimizerType).advices;
            (rootObj.swarm as SwarmOptimizerType).callbacks!.get(name)!( advices , rootObj )
        }) 
    }
    catch(err) {
        throw new CxError( __filename, 'addOptimizer()', 'OPTI-0010', `addOptimizer() failed`, err)
    }
}




export async function removeSwarmMember<T>( actionName: string ) { 
    try {
        if ( ! ctrl.actions.has(actionName) ) 
            throw new CxError(__filename, 'removeSwarm()', 'SWARM-0008', `No action instance named ${actionName} is registered.`)
        //
        // Get objects
        //
        let rootObj   = ctrl.actions.get(actionName)!
        // let rootName  = rootObj.meta.storeName

        if ( ! rootObj.isSwarmMaster() ) throw new CxError(__filename, 'removeSwarm()', 'CTRL-0012', `${actionName} is not a swarmMaster instance`)
        let swarmChildren = ( rootObj.swarm! as SwarmMasterType).children 
        let lastChild = swarmChildren.length -1
        if ( lastChild > 0  ) {
            ctrl.removeAction( swarmChildren[lastChild] )
            swarmChildren.pop()
        }  
    }
    catch(err) {
        throw new CxError(__filename, 'removeSwarm()', 'SWARM-0009', `Failed to remove swarm member`, err)
    }
}

export async function updateSwarm( actionName: string, newCount: number ) {
    if ( ! ctrl.actions.has(actionName) ) 
        throw new CxError(__filename, 'removeSwarm()', 'SWARM-0010', `No action instance named ${actionName} is registered.`)
    
    let rootObj = ctrl.actions.get(actionName)!
    let conf  = config.getNodeConfig(actionName)

    if ( ! rootObj.isSwarmMaster() ) 
        throw new CxError(__filename, 'removeSwarm()', 'SWARM-0011', `${actionName} is not a swarmMaster instance`)
    
    if ( newCount > conf.minimum || newCount < conf.minimum ) 
        throw new CxError(__filename, 'removeSwarm()', 'SWARM-0012', `${newCount} is out of range: ${conf.minimum} - ${conf.maximum}`)
    
    let children = (rootObj.swarm as SwarmMasterType).children
    
    if ( newCount > children.length ) {
        // Add Swarm objects
        addSwarm(actionName,  newCount--)
    }
    else {
        while ( newCount < (rootObj.swarm as SwarmMasterType).children.length  ) {
            // Remove Swarm processes 
             removeSwarmMember( actionName )
             newCount++
        }
    }
}

export async function removeSwarm( actionName: string, _swarmSize: number = 0 ) { // TODO: Do the testing
    try {
        if ( evalSwarmCount( actionName, _swarmSize) ) {
            //
            // Get objects
            //
            let rootObj   = ctrl.actions.get(actionName)!

            if ( ! rootObj.isSwarmMaster() ) 
                throw new CxError(__filename, 'removeSwarm()', 'SWARM-0013', `${actionName} is not a swarmMaster instance`)

            let swarmChildren = (rootObj.swarm! as SwarmMasterType).children.reverse()
            let length = swarmChildren.length
            for ( let i = length - 1 ; i >= 0; i-- ) {
                removeSwarmMember( swarmChildren[i] )
            }   
        }
    }
    catch(err) {
        throw new CxError(__filename, 'removeSwarm()', 'SWARM-0014', `Failed to remove swarm due to: ${err}`)
    }
}