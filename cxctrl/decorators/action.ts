import { ctrl , Action } from '../mod.ts'
import { $plog, perf } from '../../cxutil/mod.ts'
import { expect }  from 'https://deno.land/x/expect/mod.ts'
import * as _ from "https://deno.land/x/lodash@4.17.19/lodash.js"
import { ActionConfigType, MetaType, StateKeys } from '../interfaces.ts'
import isUndefined from "https://raw.githubusercontent.com/lodash/lodash/master/isUndefined.js"
import cloneDeep from "https://raw.githubusercontent.com/lodash/lodash/master/cloneDeep.js"
import merge from "https://raw.githubusercontent.com/lodash/lodash/master/merge.js"
import isEmpty from "https://raw.githubusercontent.com/lodash/lodash/master/isEmpty.js"

export function action<S>( config: ActionConfigType<S> ) {
    return function <T extends { new(...args: any[]): {} }>(constructor: T) { 
        config.name = isUndefined(config.name) ? constructor.name : config.name !
        // console.log( `00 - creating action constructor for ${config.name}  --> constructor.name defined: ${! isUndefined(constructor.name)} ` ) // and prototype: ${Object.getPrototypeOf(constructor)}
            let original: T = constructor
            //
            // Set the meta data
            // 
            let meta = {
                name: config.name,
                funcName: isUndefined(config.ctrl) ? 'main' : config.ctrl as string,
                init: isUndefined(config.init) ? false : config.init,
                className: constructor.name
            }
            // 
            // Create the new constructor behaviour
            //
            const c: any = function (...args: any[]) {
                const instance: any =  new original(...args);
                instance.meta = cloneDeep( meta )  
                //
                // Initialize State if:
                // 1) It has not been initilized via the constructor
                // 2) not 1) and the configuration is different from the current state ( ~ we have inheritance )
                //
                if ( instance.stateInit === false && ( config.state !== instance.state ) ) {
                    instance.state = merge( cloneDeep( config.state ), { jobId: -1, taskId: -1 } ) 
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
