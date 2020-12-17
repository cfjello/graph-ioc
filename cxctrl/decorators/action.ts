import { ActionConfigType, MetaType, StateKeys } from '../interfaces.ts'
import isUndefined from "https://raw.githubusercontent.com/lodash/lodash/master/isUndefined.js"
import cloneDeep from "https://raw.githubusercontent.com/lodash/lodash/master/cloneDeep.js"
import merge from "https://raw.githubusercontent.com/lodash/lodash/master/merge.js"

export function action<S>( config: ActionConfigType<S> ) {
    return  function <T extends { new(...args: any[]): {} }>(constructor: T) { 
        config.name = isUndefined(config.name) ? constructor.name : config.name !
        // console.log( `creating constructor for ${config.name}  --> constructor.name defined: ${! isUndefined(constructor.name)} ` ) // and prototype: ${Object.getPrototypeOf(constructor)}
            let original: T = constructor
            return class extends constructor {  
                meta : MetaType = { 
                    /**
                    * The common Name of both the action and the state data object in the store
                    */
                    name:  config.name ,      

                    /**
                    * The name of the controller Function to call within the action instance
                    */
                    funcName: isUndefined(config.ctrl) ? 'main' : config.ctrl as string,

                    /**
                    * Class name of action
                    */
                    className: constructor.name,

                    /**
                     * Init indicates whether the state is initialized with state data when first registered 
                     * in the Store:
                     *  - Setting Init to true means that the first time the object is referenced it is assumed 
                     *    to already have been initialized
                     *  - The default is false which in turn means that the controller function named by 'ctrl'
                     *    will be called the first time the object is referenced    
                     */
                    init: isUndefined(config.init) ? false : config.init,

                    /**
                     *  callCount is the number of times the named ctrl-function has been called
                     * */
                    callCount: 0
                }
                // __dummy_ = console.log(`Init state in decorator ${this.meta.name}`)
                /**
                * State is the data that the action will eventually publish for other actions to read
                */
                state: S & StateKeys  =  merge( cloneDeep( config.state ), { jobId: -1, taskId: -1 } )
            }
        }
}
