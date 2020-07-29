export type ActionDescriptor = {
    name:       string
    ident:      string 
    storeId?:   number 
    children:   string[]
    isDirty?:   boolean
    transId?:   number
    promise?:   Promise<unknown> 
}

export interface ActionDescriptorIntf {
    getActionsToRun(): Map<string, ActionDescriptor>
    getPromise(): Promise<unknown>
    run(): Promise<void>
}

export type ActionConfigType<S> = {
    name?:   string
    ctrl?:   string
    state:  S
}

import {Action} from "./Action.ts"
export type cloneConfigType<S> = {
    action:  Action<S>
    name?:   string
    ctrl?:   string
    state:  S
}
