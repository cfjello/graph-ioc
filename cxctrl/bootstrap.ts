import { ctrl, Action, action }  from '../cxctrl/mod.ts'
import { ActionConfigType, MetaType, StateKeys } from '../cxctrl/interfaces.ts'
import { CxError, _, ee } from '../cxutil/mod.ts'

const __filename = new URL('', import.meta.url).pathname

// deno-lint-ignore no-explicit-any
export type Constructor<T = unknown> = new (...args: any[]) => T;

export async function bootstrap<T,C>( Type: Constructor<T>, config: ActionConfigType<C> ): Promise<T> {
    let instance: Action<T>
    try { 
        //
        // Create the new object
        //
        instance = new Type() as unknown as Action<T>
        //
        // Setup the object Meta information
        //
        let name = _.isUndefined(config.name) ? Type.prototype.constructor.name : config.name
        instance.meta =  {
            name:           name,
            funcName:       _.isUndefined(config.ctrl) ? 'main'   : config.ctrl as string,
            init:           _.isUndefined(config.init) ? false    : config.init,
            className:      Type.prototype.constructor.name === 'FACTORY_CLASS' ? config.name : Type.prototype.constructor.name,  
            callCount:      0 
        } as MetaType

        let isSwarmObj =  ! _.isUndefined(config.swarmName!) 
        if ( isSwarmObj ) {
            instance.swarm = {
                swarmName:  _.isUndefined(config.swarmName!) ? name   : config.swarmName,
                canRun:     true,
                canBeDisposed: false,
                swarmLsnr:  undefined,
                reward:     (val: number) => { /* do nothing */ },
                children :  []
            }
        }
        else {
            instance.swarm!.swarmName = name
        }
        //
        // Clone the object state if needed
        //
        if ( instance.stateInit === false && ! _.isEqual( config.state, instance.state ) ) {
            instance.state = _.cloneDeep( config.state )
        }
        //
        // Register the object, if it is an actual new action object 
        // (and not a swarm object that shares the store storeName 'storeName', but has a different swarmName )
        //
        if ( instance.isMaster() ) { 
            await instance.register()
        }
        else if ( instance.swarm !== undefined) {
            //
            // Set the reward function for the swarm object
            //
            instance.swarm.reward = ( val: number, name: string = 'swarm' ): void => { 
                let msg = { value: val, name: name }
                ee.emit( `${instance.meta.name}_reward`, msg )
            }
            //
            // Set up a event listener for the swarm object
            //
            instance.swarm.swarmLsnr = ee.on( 
                `${instance.swarm.swarmName}_msg`, 
                (msg: string): void => { 
                                        // console.log(`Event: ${instance.swarm.swarmName}_msg, MSG: ${msg}`)
                                        if ( msg === 'stop' ) 
                                            instance.swarm!.canRun = false 
                                        else if ( msg === 'start' ) 
                                            instance.swarm!.canRun = true 
                                        })
        }
    }
    catch(err) { 
        throw new CxError(__filename, 'bootstrap()', 'BOOTSTRAP-0001', `Bootstrap cannot instanciate object`,err) 
    }
    if ( _.isUndefined( instance! ) ) 
        throw new CxError(__filename, 'bootstrap()', 'BOOTSTRAP-0002', `Bootstrap instance is undefined`)
    
    return Promise.resolve(instance! as unknown as T)
}
