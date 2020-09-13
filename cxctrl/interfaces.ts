import {Action} from "./Action.ts"
import { ActionDescriptor } from "./ActionDescriptor.ts"

export interface RunIntf {
    getEventName():        string,
    getJobId(): number,
    getActionsToRun(): Map<string, ActionDescriptor>
    run(): Promise<void>
}

export interface StateKeys {
    jobId:   number
    taskId: number
}

interface ActionIntf {
    new (name: string): ActionIntf
}

export type ActionConfigType<S> = {
    name?:   string
    ctrl?:   string
    state:   S
    comp?:   string[]
    _cnt_?:  number // internal object counter
}

export type cloneConfigType<S> = {
    action:  Action<S>
    name?:   string
    ctrl?:   string
    state:  S
}
