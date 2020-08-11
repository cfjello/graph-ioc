import {Action} from "./Action.ts"
import { ActionDescriptor } from "./ActionDescriptor.ts"
/*
export type ActionDescriptorT = {
    name:       string
    ident:      string 
    storeId?:   number 
    children:   string[]
    isDirty?:   boolean
    transId?:   number
    seqId?:     number,
    ran:        boolean,
    success:    false,
    // actionObj?:  Action<any>
    // promise?:   Promise<unknown> 
}
*/

export interface ActionDescriptorIntf {
    getJobId():        string,
    getActionsToRun(): Map<string, ActionDescriptor>
    getPromise(): Promise<unknown>
    run(): Promise<void>
}

export type ActionConfigType<S> = {
    name?:   string
    ctrl?:   string
    state:  S
}


export type cloneConfigType<S> = {
    action:  Action<S>
    name?:   string
    ctrl?:   string
    state:  S
}
