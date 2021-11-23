import EventEmitter from "https://raw.githubusercontent.com/denolibs/event_emitter/master/lib/mod.ts"
import { Action } from "../cxctrl/Action.ts";
import { SwarmOptimizer } from "./SwarmOptimizer.ts"

export type OptimizerRewardType = {
    issuer: string,
    name:   string,
    value:  number
}

export type Advice = {
    name:   string,
    done:   boolean,
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
    swarmName:      string,
    active:         boolean,
    swarmLsnr:      EventEmitter,
    reward:         ( value: number, name?: string, swarmName?: string ) => void 
}

export type SwarmMasterType =  SwarmChildType & {
    children:      string[]
}

export type OptimizerCallback = ( eventName: string, actionName: string, advice:Advice ) => void

export type SwarmOptimizerType = SwarmMasterType & {
    optimizers:    Map<string, SwarmOptimizer>,
    callbacks:     Map<string, OptimizerCallback>,
    roundRobin:    (operation: string) => string,
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