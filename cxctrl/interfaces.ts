import { NodeConfiguration } from "../cxconfig/interfaces.ts"

export class ActionDescriptor {
    constructor ( 
        public rootName:    string               = "",  
        public storeName:   string               = "",
        public actionName:  string               = "",
        public ident:       string               = "",
        public jobId :      number               = -100,  
        public taskId:      number               = -100,
        public forceRunRoot: boolean             = false,
        public storeId:     number               = -1,
        public children:    string[]             = [],
        public isDirty:     boolean              = false,
        public eventName:   string               = "",                   
        public ran:         boolean              = false,
        public success:     boolean              = false,
        // public type:       string               = "desc",
        public nodeConfig?:   NodeConfiguration,
        public promise: Promise<unknown> | undefined = undefined  
      ) {      
    }
}

export interface RunIntf {
    getEventName():     string,
    getJobId():         number,
    getActionsToRun():  Map<string, ActionDescriptor>
    run():              Promise<void>
}

export interface StateKeys {
    jobId:      number,
    taskId:     number,
    refCount:   number
}

interface ActionIntf {
    new (name: string): ActionIntf
}

export interface ConfigMetaType {
    name?:   string,
    ctrl?:   string,
    // comp?:   string[],
    init?:   boolean,
    intern?:  boolean,
    swarmName?: string
}

export type ActionConfigType<S> = ConfigMetaType & { state:   S }

export type MetaType = ConfigMetaType & { 
    callCount:      number, 
    className?:     string, 
    funcName?:      string,  
}

export type IteratorConfType = {
    caller: string, 
    target: string, 
    nestedIterator: boolean, 
    continuous: boolean,
    indexKey: number | string , 
    indexOffset: number, 
    indexPrefix: string
}
