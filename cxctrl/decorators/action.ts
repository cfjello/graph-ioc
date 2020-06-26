import { ActionConfigType } from '../interfaces.ts'
// import * as Ctrl from "../Ctrl.ts"
// import { Action } from '../Action.ts'
import isUndefined from "https://deno.land/x/lodash/isUndefined.js"
// import uniq from "https://deno.land/x/lodash/uniq.js"
// import union from "https://deno.land/x/lodash/union.js"
// import "reflect-metadata" 
import  mixinDeep from "./mixinDeep.js"

export function action<S>(config: ActionConfigType<S> ) {
    return  function <T extends { new(...args: any[]): {} }>(constructor: T) { 
        let newConstructor =   class extends constructor {          
            name:        string  = isUndefined(config.name) ? constructor.name : config.name !
            funcName:    any     = isUndefined(config.ctrl) ? 'ctrl' : config.ctrl as any
            className:   string  = constructor.name
            state:       S       = mixinDeep( config.state, this['state'] ) 
        } 
        return newConstructor
    }
}