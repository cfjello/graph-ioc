import { Action } from "./mod.ts"
// import { ActionDescriptorT } from "./interfaces.ts"

export class ActionDescriptor {
    constructor ( 
        public name:       string               = "",
        public ident:      string               = "",
        public storeId:    number               = -100,
        public children:   string[]             = [],
        public isDirty:    boolean              = false,
        public transId :   number | undefined   = -100,   
        public seqId:      number | undefined   = -100,                        
        public ran:        boolean              = false,
        public success:    boolean              = false,
        public promise: Promise<unknown> | undefined = undefined  
      ) {
         
    }
}