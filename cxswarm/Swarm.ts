import { sprintf } from "https://deno.land/std/fmt/printf.ts"
import { ConfigMetaType, ActionConfigType, ActionDescriptor } from "../cxctrl/interfaces.ts"
import { SwarmConfiguration, 
         SwarmChildType, 
         SwarmMasterType, 
         SwarmOptimizerType, 
         Approach, 
         Advice, 
         OptimizerCallback  
        } from "./interfaces.ts"
import { ctrl, Action }  from '../cxctrl/mod.ts'
import { config } from "../cxconfig/mod.ts"
// import { NodeConfiguration } from "../cxconfig/interfaces.ts"
import { SwarmOptimizer} from "./SwarmOptimizer.ts"
import { bootstrap, bootstrapFromAction, Constructor } from "../cxctrl/bootstrap.ts"
import {$log, perf, ee, CxError, _ , Mutex, debug } from "../cxutil/mod.ts"

const __filename = new URL('', import.meta.url).pathname
const mutex = new Mutex();

//
// Debug logger
//
export const sbug = debug('swarm') 

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
    actionObj:  Action<any>, 
    swarmType:  'child' | 'master' | 'optimizer', 
    confMeta:   ConfigMetaType | undefined  = undefined 
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
            const rewardMsgName      = `${actionObj.meta.name!}_reward`
            const actionName         = `${actionObj.meta.name}` 
            actionObj.swarm = {
                init:           true,
                swarmName:      _swarmName,
                canRun:         true,
                active:         false,
                swarmLsnr:      ee.on( `${_swarmName}_msg`, 
                                    (msg: string): void => { 
                                        if ( msg === 'stop' )
                                            actionObj.swarm.canRun = false 
                                        else if ( msg === 'start' ) 
                                            actionObj.swarm.canRun = true 
                                    }
                                ),
                reward: ( value: number, optimizerName: string = 'swarm', swarmName: string = _swarmName ): void => { 
                    ee.emit( rewardMsgName, actionName, value, optimizerName, swarmName )
                },
            } as SwarmChildType
        }

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
                    const eventName  = `${actionObj.meta.name}_advice`;
                    const actionName = `${actionObj.meta.name}`;
                    ( actionObj.swarm as SwarmOptimizerType).onAdvice = ee.on( eventName, async ( eventName: string, actionName: string ) => {
                            // let advices = ( actionObj.getState( eventName ) as unknown as OptimizerType).advices
                            let callbackName   = eventName.replace('_optimize_', '_callback_')
                            // sbug('onAdvice received: %s.%s', eventName, actionName)
                            let _swarm = (actionObj.swarm as SwarmOptimizerType)
                            if ( _swarm.callbacks && _swarm.callbacks.has(callbackName) ) {
                                _swarm.callbacks.get(callbackName)!(eventName, actionName)
                            }
                            else {
                                throw new CxError(__filename, 'onAdvice()', 'OPTI-0005', `No optimizer callback named: ${callbackName}` )
                            }
                            return Promise.resolve()
                    })            
                //
                // Overwrite the child reward function with master reward function
                // 
                const optimizerPrefix: string   = `${actionObj.meta.name}_optimize`;
                ( actionObj.swarm as SwarmOptimizerType).onReward = ee.on(
                    `${actionObj.meta.name}_reward`, 
                    ( targetName: string, value: number, optimizerName: string , swarmName: string ): void => { 
                        try {
                            let actionObj = ctrl.actions.get(targetName)!
                            let fullName   = `${optimizerPrefix}_${optimizerName}`
                            let _swarm = ( actionObj.swarm as SwarmOptimizerType)
                            if ( _swarm.optimizers.has(fullName) ) {
                                let optimizer = _swarm.optimizers.get(fullName)!
                                optimizer.reward(value, optimizerName)
                            }
                            else  {
                                let keys = Object.keys(_swarm.optimizers)
                                throw new Error(`no Optimizer named: ${fullName}. Available keys are: ${keys}`)
                            }
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
            throw Error(`No action instance named ${actionName} is registered.`)

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
                throw Error(`SwarmSize: ${addCount}, is greater than configuration allows: ${conf.maximum}.`)
        }
        else {
            //
            // Update to the instance count - Check current + update against the configuration defaults
            // 
            if ( ! rootObj.isSwarmMaster() ) throw Error(`${actionName} is not a swarmMaster instance`)

            let currChildCount  = (rootObj.swarm as SwarmMasterType)?.children?.length ?? 0 
            let newSwarmCount   =  currChildCount === 0 && addCount < conf.minimum ? conf.minimum : addCount
            addCount = currChildCount + newSwarmCount

            if ( addCount < conf.minimum || addCount > conf.maximum ) 
                throw Error(`${addCount} is out of range: ${conf.minimum} to ${conf.maximum}`)
        }
        return addCount
    }
    catch(err) {
        throw new CxError( __filename, 'evalSwarmCount()', 'SWARM-0007', `Failed to build swarm.`, err )
    }
}

function isConstructor(f: any) {
    try {
      new f();
    } catch (err) {
      if (err.message.indexOf('not a constructor') >= 0) {
        return false;
      }
    }
    return true;
}

export async function addSwarm<T>( 
    actionName: string, 
    addCount: number = 0
    ) {
    try {    
        let rootObj     = ctrl.actions.get(actionName)!
        let actionClass = Object.getPrototypeOf(rootObj) === null ? rootObj : Object.getPrototypeOf(rootObj).constructor
        let rootName    = rootObj.meta.name!  
        
        let newCount = evalSwarmCount( actionName, addCount ) 

        let rootDeps: string[]  = ctrl.graph.getOutgoingEdges( rootName )  
        //
        // Setup the swarm interface and optimizer reward function
        //
        setSwarmCtrl( rootObj, 'master', config.nodeConfig.get(actionName)! )

        let childCount = (rootObj.swarm as SwarmMasterType).children.length 

        //
        // Bootstrap new action object instances from the root object and add them to ctrl.actions
        // 
        sbug('addSwarm to %s new: %d', actionName, newCount)
        for( let i = childCount; i < newCount ; i++ ) {
            //
            // Create and add new swarm object
            //
            let name = sprintf("%s_swarm_%04d", actionName, i)
            sbug('Add Action: %s', name)
            ctrl.graph.addNode( name )
            let actionConfig: ActionConfigType<T> = { name: rootName, swarmName: name, init: false, state: rootObj.state } 
            
            ctrl.actions.set( name, await bootstrap( actionClass as unknown as Constructor<T> , actionConfig ) as unknown as Action<T> )
            //
            // Configure the new and the root objects
            //
            ctrl.actions.get(name)!.setDependencies( ...rootDeps );
            (rootObj.swarm as SwarmMasterType).children.push( name ) 
        }
        sbug('Length of %s.swarm.children: %d', rootObj.meta.name , (ctrl.actions.get(actionName)!.swarm as SwarmMasterType).children.length)
    }
    catch(err) {
        throw new CxError( __filename, 'addSwarm()', 'SWARM-0002', `Failed to add the swarm.`, err )
    }
}

export async function addToSwarm<T>( 
    actionName: string, 
    addCount: number = 0,
    startUp: boolean = false
    ) {
    try {    
        let rootObj     = ctrl.actions.get(actionName)!
        // let actionClass = Object.getPrototypeOf(rootObj) === null ? rootObj : Object.getPrototypeOf(rootObj).constructor
        let rootName    = rootObj.meta.name!  

        if ( ! rootObj.isSwarmMaster )  throw Error(`${rootName} is not a SwarmMaster`)
        
        let newCount = evalSwarmCount( actionName, addCount ) 
        let rootDeps: string[]  = ctrl.graph.getOutgoingEdges( rootName )  
        let childCount = (rootObj.swarm as SwarmMasterType).children.length 

        //
        // Bootstrap new action object instances from the root object and add them to ctrl.actions
        // 
        sbug('addToSwarm to %s new: %d', actionName, newCount)
        for( let i = childCount; i < newCount ; i++ ) {
            //
            // Create and add new swarm object
            //
            let name = sprintf("%s_swarm_%04d", actionName, i)
            sbug('Add Action: %s', name)
            ctrl.graph.addNode( name )

            let actionConfig: ActionConfigType<T> = { name: rootName, swarmName: name, init: false, state: rootObj.state } 
            ctrl.actions.set( name, await bootstrapFromAction( rootObj , actionConfig ) as unknown as Action<T> )
            
            let childObj = ctrl.actions.get( name )! 
            if ( (rootObj.swarm as SwarmMasterType).active ) { 
                childObj.currActionDesc = rootObj.currActionDesc
            }
            //
            // Configure the new object
            //
            ctrl.actions.get(name)!.setDependencies( ...rootDeps );
            (rootObj.swarm as SwarmMasterType).children.push( name ) 
            let ad          = _.clone(rootObj.currActionDesc) as ActionDescriptor
            ad.children     = []
            ad.actionName   = name 
            ad.forceRunRoot = true
            ad.isDirty      = true
            ad.ran          = false
            ad.success      = false
            //
            // Start the async execution of it if the swarm master object is running
            // else wait for the swarm master main() to run 
            if ( ( rootObj.swarm as SwarmMasterType ).active ) { 
                ctrl.actions.get(name)!.__exec__ctrl__function__(ad)
            }
        }
        
        sbug('Length of %s.swarm.children: %d', rootObj.meta.name , (ctrl.actions.get(actionName)!.swarm as SwarmMasterType).children.length)
    }
    catch(err) {
        throw new CxError( __filename, 'addSwarm()', 'SWARM-0002', `Failed to add the swarm.`, err )
    }
}

export async function addOptimizer( 
    rootObj: Action<any>,  
    name: string = 'swarm', // the default
    callback:  OptimizerCallback | undefined = undefined
    ) 
{
    try {
        let rootName: string = rootObj.getName() 
        //
        // Validation
        //
        if ( ! rootObj.isSwarmMaster() ) 
            throw new CxError( 
                __filename, 
                'addOptimizer()', 
                'OPTI-0004', 
                `Object ${name} is not a swarm master object.`
            )
        if ( !  config.nodeConfig.has(rootName) ) 
            throw new CxError( 
                __filename, 
                'addOptimizer()', 
                'OPTI-0005', 
                `Object ${name} has no Swarm configuration.`
            )
        
        let conf = config.nodeConfig.get(rootName)! 
        let storeName = `${rootObj.meta.name}_optimize_${name}`

        setSwarmCtrl(rootObj, 'optimizer', conf)

        if ( ! conf.approach ) 
            throw new CxError( 
                __filename, 'addOptimizer()'
                , 'OPTI-0006', 
                `addOptimizer ${name} to create optimizer for config: ${JSON.stringify(conf, undefined,2)}`
            );

        if ( (rootObj.swarm as SwarmOptimizerType).optimizers.has(storeName ) )
            throw new CxError( 
                __filename, 
                'addOptimizer()', 
                'OPTI-0007', 
                `addOptimizer storeName ${storeName} for ${name} allready exists - delete the existing optimizer first`
            );
        //
        // Create optimizer
        //
        if ( _.isUndefined(conf.jobThreshold) ) config.setThreshold( rootName, 10 ); // Default for optimizers

        (rootObj.swarm as SwarmOptimizerType).optimizers!.set( 
            storeName, 
            await new SwarmOptimizer( _.omit( conf, ['jobThreshold'] ) , 
            rootObj.meta.name! 
        ).register(storeName) )

        const callbackName = `${rootName}_callback_${name}`
        if ( name == 'swarm' && !  callback ) { 
            //
            // Add a default callback for the number of 'swarm' objects  
            //      
            
            (rootObj.swarm as SwarmOptimizerType).callbacks.set(callbackName, async function ( eventName: string, actionName: string) { 
                sbug('Swarm Callback: %s for optimizer: %s and ActionObj: %s', callbackName, eventName, actionName)
                try {
                    let actionObj    = ctrl.actions.get(actionName)!
                    let optimizer    = (actionObj.swarm as SwarmOptimizerType).optimizers.get(eventName)
                    
                    Mutex.doAtomic(callbackName, async () => {
                        let advice: Advice = ctrl.getStateData(eventName)
                        // let advices      = advice.advices
                        // let idx          = advices.length -1
                        let last: Advice = _.clone(advice)

                        // let nextToLast = advices[ idx -1 ] ?? { done: false , advice: last.advice -1, reward: last.reward -1 }
                        // if ( ! last.done && nextToLast.advice !== last.advice ) {
                        if ( ! last.handled) {
                            sbug('Callback: with Advice: %j', last)
                            let children = (actionObj.swarm as SwarmOptimizerType).children
                            if ( last.advice !== children.length ) {
                                sbug('Swarm Callback handles: %d', last.advice)
                                await updateSwarm(actionObj.meta.name!, last.advice)
                                last.handled = true
                                optimizer!.state =  last  
                                optimizer!.publish()
                            }
                            else {
                                sbug('Swarm Callback rejects: %d', last.advice)
                            }
                        }
                    })
                }
                catch(err) {
                    throw new CxError( 
                        __filename, 'addOptimizer()', 
                        'OPTI-0008', 
                        `Calback ${callbackName} failed`,
                        err
                    );
                }
            }) 
        }
        else if ( callback ) {
            (rootObj.swarm as SwarmOptimizerType).callbacks!.set(callbackName, () => callback ) 
        }
        else {
            throw new CxError( 
                __filename, 'addOptimizer()', 
                'OPTI-0009', 
                `${name} optimizer ${callbackName} has no callback function - please provide one when adding the optimizer`
            )
        }
    }
    catch(err) {
        throw new CxError( 
            __filename, 
            'addOptimizer()', 
            'OPTI-0010', 
            `addOptimizer() failed`, 
            err
        )
    }
}

export async function removeSwarmMember<T>( actionName: string ) { 
    try {
        if ( ! ctrl.actions.has(actionName) ) 
            throw Error(`No action instance named ${actionName} is registered.`)
        //
        // Get objects
        //
        let rootObj   = ctrl.actions.get(actionName)!
        // let rootName  = rootObj.meta.storeName

        if ( ! rootObj.isSwarmMaster() ) 
            throw Error( `${actionName} is not a swarmMaster instance` )
        
        let swarmChildren = ( rootObj.swarm! as SwarmMasterType).children 
        let lastChild = swarmChildren.length -1
        let child = ctrl.actions.get( swarmChildren[lastChild] )!
        if ( lastChild > 0  && ! (child.swarm as SwarmChildType).active ) {
            ctrl.removeAction( swarmChildren[lastChild] )
            swarmChildren.pop()
        }  
        else {
            sbug(`Could not remove swarm object`)
        }
    }
    catch(err) {
        throw new CxError(
            __filename, 
            'removeSwarm()', 
            'SWARM-0009', 
            `Failed to remove swarm member`, 
            err
        )
    }
}

export async function updateSwarm( actionName: string, newCount: number ) {
    try {
        if ( ! ctrl.actions.has(actionName) ) 
            throw Error( `No action instance named ${actionName} is registered.`)
        
        let rootObj = ctrl.actions.get(actionName)!
        let conf  = config.getNodeConfig(actionName)

        if ( ! rootObj.isSwarmMaster() ) 
            throw Error(`${actionName} is not a swarmMaster instance`)
        
        if ( newCount > conf.maximum || newCount < conf.minimum ) 
            throw Error( `${newCount} is out of range: ${conf.minimum} - ${conf.maximum}`)
        
        let children = (rootObj.swarm as SwarmMasterType).children
        
        if ( newCount > children.length ) {
            // Add Swarm objects
            sbug('In updateSwarm() with %s new total count: %d and current count: %d => add: %d', actionName, newCount, children.length, newCount - children.length)
            await addToSwarm( actionName,  newCount - children.length, true )
            sbug('UpdateSwarm AFTER add: %d', (rootObj.swarm as SwarmMasterType).children.length )
        }
        else {
            sbug('UpdateSwarm remove: %d', children.length - newCount)
            let removeCnt = children.length - newCount 
            while ( removeCnt > 0) {
                // Remove Swarm process 
                await removeSwarmMember( actionName )
                removeCnt--
            }
            sbug('UpdateSwarm AFTER remove: %d', (rootObj.swarm as SwarmMasterType).children.length )
        }
    }
    catch(err) {
        throw new CxError(__filename, 'removeSwarm()', 'SWARM-0012', `UpdateSwarm() failed`, err)
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
                await removeSwarmMember( swarmChildren[i] )
            }   
        }
    }
    catch(err) {
        throw new CxError(__filename, 'removeSwarm()', 'SWARM-0014', `Failed to remove swarm due to: ${err}`)
    }
}