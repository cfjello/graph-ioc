import { SwarmConfiguration } from "../cxswarm/interfaces.ts"

export type jobThresholdType = {
    jobThreshold:   number,
}

export type NodeConfiguration = jobThresholdType & SwarmConfiguration
