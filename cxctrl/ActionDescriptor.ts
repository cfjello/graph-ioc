import { Action } from "./mod.ts"
import { jobIdSeq, taskIdSeq } from "./generators.ts"

// import { ActionDescriptorT } from "./interfaces.ts"

export class ActionDescriptor {
    constructor ( 
        public type:       string               = "desc",
        public rootName:   string               = "",
        public name:       string               = "",
        public ident:      string               = "",
        public storeId:    number               = -100,
        public children:   string[]             = [],
        public isDirty:    boolean              = false,
        public eventName:  string               = "",
        public jobId :     number | void        = -100,  
        public taskId:     number | undefined   = -100,                        
        public ran:        boolean              = false,
        public success:    boolean              = false,
        public promise: Promise<unknown> | undefined = undefined  
      ) {
         
    }
}