import EventEmitter from "https://raw.githubusercontent.com/denolibs/event_emitter/master/lib/mod.ts"
import { Action } from "../cxctrl/Action.ts";
import { SwarmOptimizer } from "./SwarmOptimizer.ts"

export type OptimizerRewardType = {
    issuer: string,
    name:   string,
    value:  number
}
/*
export type OptimizerMeasureType = {
    ts:    number
    value: number
}
*/ 

export type Advice = {
    done: boolean,
    advice: number,
    reward: number,
    ts:     number,
    handled: boolean
}

export type SwarmInitType = {
    init:           boolean,
    canRun:         boolean,
}

export type SwarmChildType = SwarmInitType & {
    init:           boolean,
    swarmName:      string,
    active:         boolean,
    swarmLsnr:      EventEmitter,
    reward:         ( value: number, name: string | undefined ) => void 
}

export type SwarmMasterType =  SwarmChildType & {
    children:      string[]
}

export type OptimizerCallback = (eventName: string, actionName: string ) => void

export type SwarmOptimizerType = SwarmMasterType & {
    optimizers:    Map<string, SwarmOptimizer>,
    callbacks:     Map<string, OptimizerCallback>,
    onReward:      EventEmitter,
    onAdvice:      EventEmitter
}

export type Approach =  'binary' | 'interval' 

export type SwarmConfiguration = {
    name:           string,
    minimum:        number,
    maximum:        number,
    approach?:      Approach,
    interval?:      number,
    timerMS?:       number,
    skipFirst?:     number,
}

/*
export type  OptimizerTypeArray =  SwarmConfiguration & {
    buffer:         number[],
    rewards:        OptimizerMeasureType[],
    advices:        Advice[]
}


export type  OptimizerType = {
    reward:        OptimizerMeasureType,
    advice:        Advice
}
*/