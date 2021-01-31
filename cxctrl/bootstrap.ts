import { ctrl, Action, action }  from '../cxctrl/mod.ts'
import { ActionConfigType, MetaType, StateKeys } from '../cxctrl/interfaces.ts'
import { _ } from '../cxutil/lodash.ts'

// deno-lint-ignore no-explicit-any
export type Constructor<T = unknown> = new (...args: any[]) => T;

export async function bootstrap<T,C>( Type: Constructor<T>, config: ActionConfigType<C> ): Promise<T> {

    let instance = new Type() as unknown as Action<T>
    instance.meta =  {
        name:      _.isUndefined(config.name) ? Type.prototype.constructor.name : config.name ,
        funcName:  _.isUndefined(config.ctrl) ? 'main'   : config.ctrl as string,
        init:      _.isUndefined(config.init) ? false    : config.init,
        className: Type.prototype.constructor.name === 'FACTORY_CLASS' ? config.name : Type.prototype.constructor.name 
    } as MetaType

    if ( instance.stateInit === false && ! _.isEqual(_.merge( config.state, { jobId: -1, taskId: -1 } ), instance.state ) ) {
        instance.state = _.merge( _.cloneDeep( config.state ), { jobId: -1, taskId: -1 } ) 
    }

    try { 
        await instance.register()
    }
    catch(err) { console.log(err) }
    
    return Promise.resolve(instance as unknown as T)
}
