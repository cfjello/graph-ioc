import {Action} from "./Action.ts"
import EventEmitter from "https://raw.githubusercontent.com/denolibs/event_emitter/master/lib/mod.ts"

export type NodeConfiguration = {
    jobThreshold: number,
    swarmSeed: number,
    swarmMax:  number,
    swarmChildren?: string[]
}


export class ActionDescriptor {
    constructor ( 
        public rootName:   string               = "",
        public storeName:  string               = "",
        public actionName: string               = "",
        public ident:      string               = "",
        public jobId :     number               = -100,  
        public taskId:     number               = -100,
        public storeId:    number               = -1,
        public children:   string[]             = [],
        public isDirty:    boolean              = false,
        public eventName:  string               = "",                   
        public ran:        boolean              = false,
        public success:    boolean              = false,
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
    comp?:   string[],
    init?:   boolean,
    swarmName?: string
}

export type ActionConfigType<S> = ConfigMetaType & { state:   S }

export type MetaType = ConfigMetaType & { 
    callCount:      number, 
    className?:     string, 
    funcName?:      string,  
    // swarmChildren?: string[],
    // canRun?:        boolean,
    // canDispose?:    boolean,
    // swarmLsnr?:     any
}

export interface SwarmIntf  {
    swarmName:  string | undefined,
    canRun:     boolean,
    canDispose: boolean,
    swarmLsnr: EventEmitter | undefined,
    children:   string[] | undefined,
    isMaster(): boolean,
}


export type IteratorConfType = {
    callee: string, 
    target: string, 
    nestedIterator: boolean, 
    continuous: boolean,
    indexKey: number | string , 
    indexOffset: number, 
    indexPrefix: string
}

/* for future use
export type SwarmConfigType = {
    actionName: string, 
    swarmSize: number,
    swarmMin?: number,  
    swarmMax?: number | undefined,
    rewardFunc?: function | undefined,
    algorithm?:   'binary' | 'Binary' | 'stepwise' | 'Stepwise' | undefined
}
*/ 