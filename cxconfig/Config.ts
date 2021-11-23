
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
const __filename = new URL('', import.meta.url).pathname
export const __dirname = path.dirname( path.fromFileUrl(new URL('.', import.meta.url)) )
import { CxError, _ } from "../cxutil/mod.ts"
import { MonitorDefaults, NodeConfiguration } from "./interfaces.ts"
import { SwarmConfiguration } from "../cxswarm/interfaces.ts"

export let nodeConfig   = new Map<string, NodeConfiguration>() 
export let globalConfig = new Map<string, any>() 


let nodeConfigDefaults:  NodeConfiguration = {
    name: "NodeDefaults",
    jobThreshold: 10,
    minimum:   5,
    maximum:   20,
    approach:  'binary',
    timerMS:   120000,
    skipFirst: 1
}

nodeConfig.set('NodeDefaults',  nodeConfigDefaults )

let monitorDefaults:  MonitorDefaults = {
    name:       "MonitorDefaults",
    port:       9999,
    runServer:  true
}

globalConfig.set('MonitorDefaults', monitorDefaults)

// 
// Configuration functions
// 
/**
 * Set the threshold and swarm configuration
 * 
 * @param name Name of the action element
 * @param conf The NodeConfiguration  for the action element
 */
 export let setNodeConfig = ( key: string, conf: Partial<NodeConfiguration> | Partial<SwarmConfiguration> ): void => {
    if ( ! nodeConfig.has(key) ) 
        nodeConfig.set(key, conf as NodeConfiguration)
    else {
        let currConfig = nodeConfig.get(key)
        nodeConfig.set(key, _.merge(currConfig, conf) as NodeConfiguration)
    }
}

/**
 * Set the threshold and swarm configuration
 * 
 * @param name Name of the action element
 * @return config The NodeConfiguration  for the action element
 */
export let getNodeConfig = ( key: string ): NodeConfiguration => {
    if ( ! nodeConfig.has(key) ) 
        throw new CxError(__filename, 'setNodeConfig()', 'CONF-0001', `There is no Configuration with name: ${key}`)
    else
        return  nodeConfig.get(key)! as NodeConfiguration
}
/**
 * Set the threshold configuration, simpler user function
 * 
 * @param name Name of the storage element
 * @param _threshold The threshold for the storage element, that how many version should be stored before attempting cleanup
 */
export let setThreshold = ( key: string, _threshold: number ): void  => {
    let threshold = _threshold < 2 ? -1 : _threshold
    try {
        setNodeConfig( key, { jobThreshold: threshold } )
    }
    catch(err) {
        throw new CxError( __filename, 'setThreshold()', 'CONF-0002', `Failed to set jobThreshold due to: ${err}` )
    }
}

/**
 * Evaluate and resolve an existing node configuration and return a new configuration - this is a configuration of the job threshold and and the swarm count and max for a given action object
 * 
 * @param name The name of the action object
 * @param name The name of the action object
 * @return NodeConfiguration A new validated node configuration
 * 
 */
 export let resolveActionConfig = (name: string, maxThreshold: number): NodeConfiguration => {
    //
    // Read and resolve the threshold information
    // 
    let nodeConf: NodeConfiguration = _.clone(nodeConfig.get(name)!)
    let threshold = nodeConf.jobThreshold 
    if ( maxThreshold >= 2  && threshold >= 2 )  { // threshold is not unlimited
        if ( threshold < maxThreshold ) {
            threshold =  maxThreshold
        }
        else {
            maxThreshold  = threshold
        }
    }
    else if ( threshold > 0 ) { // threshold is not unlimited, but ~ 1, where 2 is the minimum
        threshold = 2
    }
    //
    // Read and resolve swarm configuration
    //
    let defaults = nodeConfig.get('NodeDefaults')! as NodeConfiguration

    let minimum  = nodeConf.minimum  < 2 ? defaults.minimum : nodeConf.minimum  
    let maximum  = nodeConf.maximum  < minimum ? minimum : nodeConf.maximum
    let timerMS  = nodeConf.timerMS ?? defaults.timerMS

    nodeConf.jobThreshold = threshold
    nodeConf.minimum      = minimum
    nodeConf.maximum      = maximum
    nodeConf.timerMS      = timerMS

    return nodeConf as NodeConfiguration
}
