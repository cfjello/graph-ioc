import { NodeConfiguration } from "../cxconfig/interfaces.ts"


export type ActionDescriptorType = {
    rootName:     string,  
    storeName:    string,
    actionName:   string,
    ident:        string,
    jobId :       number,  
    taskId:       number,
    forceRunRoot: boolean,
    storeId:      number,
    children:     string[],
    isDirty:      boolean,
    eventName:    string,                   
    ran:          boolean,
    success:      boolean,
    nodeConfig?:  NodeConfiguration,
    promise: Promise<unknown> | undefined 

}

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

export type PromiseChainArgsType = {
    actionName: string, 
    runAll:     boolean, 
    runRoot:    boolean,
    jobId:      number,
    children:   string[]
}
