import { ctrl, Action, action }  from '../cxctrl/mod.ts'
import { ActionConfigType, MetaType, StateKeys } from '../cxctrl/interfaces.ts'
import { CxError, _ } from '../cxutil/mod.ts'

const __filename = new URL('', import.meta.url).pathname

// deno-lint-ignore no-explicit-any
export type Constructor<T = unknown> = new (...args: any[]) => T;

export async function bootstrap<T,C>( Type: Constructor<T>, config: ActionConfigType<C> ): Promise<T> {

    let instance: Action<T>;
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
            name:      name,
            funcName:  _.isUndefined(config.ctrl) ? 'main'   : config.ctrl as string,
            init:      _.isUndefined(config.init) ? false    : config.init,
            className: Type.prototype.constructor.name === 'FACTORY_CLASS' ? config.name : Type.prototype.constructor.name ,
            swarmName: _.isUndefined(config.swarmName!) ? name   : config.swarmName,
            callCount: 0
        } as MetaType
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
        if ( instance.meta.swarmName === name ) { 
            await instance.register()
        }
    }
    catch(err) { 
        throw new CxError(__filename, 'bootstrap()', 'BOOTSTRAP-0001', `Bootstrap cannot instanciate object`,err) 
    }
    if ( _.isUndefined( instance! ) ) 
        throw new CxError(__filename, 'bootstrap()', 'BOOTSTRAP-0002', `Bootstrap instance is undefined`)
    
    return Promise.resolve(instance! as unknown as T)
}
