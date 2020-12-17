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

export interface ConfigMetaType {
    name?:   string
    ctrl?:   string
    comp?:   string[]
    init?:   boolean
}

export type ActionConfigType<S> = ConfigMetaType & { state:   S }

export type MetaType = ConfigMetaType & { className?: string, funcName?: string, callCount:  number }

/*
export type cloneConfigType<S> = {
    action:  Action<S>
    name?:   string
    ctrl?:   string
    state:  S
}
*/
