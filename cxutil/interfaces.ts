export interface PerfMeasure { 
    suid: string, 
    transaction?: number, 
    start: number, 
    end: number | undefined, 
    desc: string,
    
}

export interface PerfLogRec extends  PerfMeasure { 
    type: string,
    token: string, 
    ms: number
}
