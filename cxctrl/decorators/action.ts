import { ActionConfigType, StateKeys } from '../interfaces.ts'
import isUndefined from "https://raw.githubusercontent.com/lodash/lodash/master/isUndefined.js"
import cloneDeep from "https://raw.githubusercontent.com/lodash/lodash/master/cloneDeep.js"
import merge from "https://raw.githubusercontent.com/lodash/lodash/master/merge.js"

export function action<S>(config: ActionConfigType<S> ) {
    return  function <T extends { new(...args: any[]): {} }>(constructor: T) { 
        config.name = isUndefined(config.name) ? constructor.name : config.name !
        console.log( `creating constructor for ${config.name}  --> constructor.name defined: ${! isUndefined(constructor.name)} ` ) // and prototype: ${Object.getPrototypeOf(constructor)}
            return class extends constructor {   
                /**
                * The common Name of both the action and the state data object in the store
                */
                name:        string  = isUndefined(config.name) ? constructor.name : config.name !

                /**
                * The name of the controller Function to call within the action instance
                */
                funcName:    any     = isUndefined(config.ctrl) ? 'ctrl' : config.ctrl as any

                /**
                * Class name of action
                */
                className:   string  = constructor.name
               
                /**
                * State is the data that the action will eventually publish for other actions to read
                */
                state: S & StateKeys  =  merge( cloneDeep( config.state ), { jobId: -1, taskId: -1 } )

                /**
                * The list of composition classes added to this asction class
                */
                __comps__ = config.comp !== undefined ? config.comp : []
            }
        }
}
