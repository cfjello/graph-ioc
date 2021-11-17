import {  Action, ctrl }  from '../cxctrl/mod.ts'
import { swarm }  from '../cxswarm/mod.ts'
import { ActionConfigType, MetaType } from '../cxctrl/interfaces.ts'
import { CxError, _, ee } from '../cxutil/mod.ts'
import { SwarmMasterType } from "../cxswarm/interfaces.ts";

const __filename = new URL('', import.meta.url).pathname

// deno-lint-ignore no-explicit-any
export type Constructor<T = unknown> = new (...args: any[]) => T;

export async function bootstrap<T,C>( Type: Constructor<T>, conf: ActionConfigType<C> ): Promise<T> {
    let instance: Action<T>
    try { 
        //
        // Create the new object
        //
        instance = new Type() as unknown as Action<T>
        //
        // Setup the object Meta information
        //
        let name = _.isUndefined(conf.name) ? Type.prototype.constructor.name : conf.name
        instance.meta =  {
            name:           name,
            funcName:       _.isUndefined(conf.ctrl) ? 'main'   : conf.ctrl as string,
            init:           _.isUndefined(conf.init) ? false    : conf.init,
            className:      Type.prototype.constructor.name === 'FACTORY_CLASS' ? conf.name : Type.prototype.constructor.name,  
            callCount:      0 
        } as MetaType
        //
        // New object is swarm child?
        // 
        let isSwarmObj =  ! _.isUndefined(conf.swarmName!) 
        if ( isSwarmObj ) { 
            if ( (ctrl.actions.get(name)?.swarm as SwarmMasterType).active ?? false ) {
                // TODO set jobId
                // set callbacks
            }
            swarm.setSwarmCtrl(instance, 'child', conf)
        }
        //
        // Clone the object state if needed
        //
        if ( instance.stateInit === false && ! _.isEqual( conf.state, instance.state ) ) {
            instance.state = _.cloneDeep( conf.state )
        }
        
        if ( ! instance.swarm.init ) { 
            //
            // This is not a swarm object. Register this new action object
            //
            await instance.register(name)
        }
        else if ( instance.isSwarmMaster() ) swarm.setSwarmCtrl(instance, 'master')
    }
    catch(err) { 
        throw new CxError(__filename, 'bootstrap()', 'BOOTSTRAP-0001', `Bootstrap cannot instanciate object`,err) 
    }
    if ( _.isUndefined( instance! ) ) 
        throw new CxError(__filename, 'bootstrap()', 'BOOTSTRAP-0002', `Bootstrap instance is undefined`)
    
    return Promise.resolve(instance! as unknown as T)
}

export async function bootstrapFromAction<T,C>( actionObj: Action<T>, conf: ActionConfigType<C> ): Promise<T> {
    return bootstrap(Object.getPrototypeOf(actionObj).constructor, conf)
}