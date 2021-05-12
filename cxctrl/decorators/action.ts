import { $plog, _ } from '../../cxutil/mod.ts'
import { ActionConfigType } from '../interfaces.ts'

export function action<S>( config: ActionConfigType<S> ) {
    return function <T extends { new(...args: any[]): {} }>(constructor: T) { 
        config.name = _.isUndefined(config.name) ? constructor.name : config.name !
        // console.log( `Creating action constructor for ${config.storeName}  --> constructor.storeName defined: ${! isUndefined(constructor.storeName)} ` ) 
            let original: T = constructor
            //
            // Set the meta data
            // 
            let meta = {
                name:       config.name,
                funcName:   _.isUndefined(config.ctrl) ? 'main' : config.ctrl as string,
                init:       _.isUndefined(config.init) ? false : config.init,
                className:  constructor.name,
            }

            let swarm = {
                swarmName:  config.name,
                canRun:     true,
                canDispose: false,
                swarmLsnr:  undefined,
                children:   undefined,
                isMaster:   () => true
            }
            // 
            // Create the new constructor behaviour
            //
            const c: any = function (...args: any[]) {
                const instance: any =  new original(...args);
                instance.meta = _.cloneDeep( meta )  
                //
                // Initialize State if:
                // 1) It has not been initilized via the constructor
                // 2) not 1) and the configuration is different from the current state ( ~ we have inheritance )
                //
                if ( instance.stateInit === false && ( config.state !== instance.state ) ) {
                    instance.state = _.cloneDeep( config.state ) 
                }
                return instance;
            }
            //
            // Copy the class prototype so intanceof operator still works
            //
            c.prototype = original.prototype;
            return c 
    }
}

export function injectStubs<S>( stubs: string[] ) {
    return function <T extends { new(...args: any[]): {} }>(constructor: T) { 
            let original: T = constructor
            // 
            // Create the new constructor behaviour
            //
            const c: any = function (...args: any[]) {
                const instance: any =  new original(...args);
                stubs.forEach( value => {
                    instance[value] = (...args: any[]) => {}
                })
                return instance;
            }
            //
            // Copy the class prototype so intanceof operator still works
            //
            c.prototype = original.prototype;
            return c 
    }
}
