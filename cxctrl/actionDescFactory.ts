import { ActionDescriptor } from "./interfaces.ts"
import { jobIdSeq, taskIdSeq } from "./generators.ts"
/**
 * Add an initial Descriptor for an Action 
 * 
 * @param name  The storeName of the Action:
 * @return ActionDescriptor  A descriptor object with some initialized values  
 */
export function ActionDescriptorFactory( name: string ): ActionDescriptor {
    return new ActionDescriptor( 
                  name, // rootName
                  name, // storeName
                  name, // actionName
                  '00.00',  // ident
                  jobIdSeq().next().value  as number,  // jobId
                  taskIdSeq().next().value as number  // taskId
    )
  }