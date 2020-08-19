import {Action} from "./Action.ts"
import { ActionDescriptor } from "./ActionDescriptor.ts"

export interface RunIntf {
    getEventName():        string,
    getActionsToRun(): Map<string, ActionDescriptor>
    run(): Promise<void>
}

export type ActionConfigType<S> = {
    name?:   string
    ctrl?:   string
    state:   S
    _cnt_?:  number // internal control param
}

export type cloneConfigType<S> = {
    action:  Action<S>
    name?:   string
    ctrl?:   string
    state:  S
}
