import { Action } from "./mod.ts"
import { jobIdSeq, taskIdSeq } from "./generators.ts"

// import { ActionDescriptorT } from "./interfaces.ts"

export class ActionDescriptor {
    constructor ( 
        public rootName:   string               = "",
        public name:       string               = "",
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
        public promise: Promise<unknown> | undefined = undefined  
      ) {      
    }
}

export function ActionDescriptorFactory( name: string ): ActionDescriptor {
  return new ActionDescriptor( 
                name, // rootName
                name, // name
                '00.00',  // ident
                jobIdSeq().next().value  as number,  // jobId
                taskIdSeq().next().value as number  // taskId
  )
}