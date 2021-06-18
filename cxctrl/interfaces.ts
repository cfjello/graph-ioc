import {Action} from "./Action.ts"
import EventEmitter from "https://raw.githubusercontent.com/denolibs/event_emitter/master/lib/mod.ts"
import { SwarmOptimizer } from "./SwarmOptimizer.ts"


export type OptimizerMeasureType = {
    ts:    number
    value: number
}

export type Advice = {
    done: boolean,
    advice: number
}


export interface SwarmIntf  {
    swarmName:      string | undefined,
    canRun:         boolean | undefined,
    canBeDisposed:  boolean | undefined,
    swarmLsnr:      EventEmitter  | undefined,
    optimizer?:     SwarmOptimizer | undefined,
    reward:         (val: number, name: string | undefined) => void, 
    children:       string[]
}


export type Approach =  'binary' | 'interval' | 'none'

export type jobThresholdType = {
    jobThreshold:   number,
}

export type SwarmConfiguration = {
    name:           string,
    minimum:        number,
    maximum:        number,
    approach?:      Approach,
    interval?:      number,
    timerInterval?: number,
    skipFirst?:     number,
    // swarmChildren:  string[]
}

export type  OptimizerType =  SwarmConfiguration & {
    buffer:         number[],
    rewards:        OptimizerMeasureType[],
    advices:        Advice[],
    swarmChildren:  string[],
    // optimizer:      (value: number)  => void,
    callback:       (advice: Advice) => void
}

/*
export type OptimizerTypeTBD = {
    name:       string,
    approach:   Approach,
    buffer:     number[]
    rewards:    OptimizerMeasureType[]
    advices:    Advice[],
    optimizer:  (value: number) => void
    callback:   (advice: Advice) => void
}
*/

export type NodeConfiguration = jobThresholdType & SwarmConfiguration

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
    comp?:   string[],
    init?:   boolean,
    swarmName?: string
}

export type ActionConfigType<S> = ConfigMetaType & { state:   S }

export type MetaType = ConfigMetaType & { 
    callCount:      number, 
    className?:     string, 
    funcName?:      string,  
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
    maximum?: number | undefined,
    rewardFunc?: function | undefined,
    algorithm?:   'binary' | 'Binary' | 'stepwise' | 'Stepwise' | undefined
}
*/ 