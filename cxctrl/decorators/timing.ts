import {perf} from 'cxutil'
/**
 * Timing decorater 
 */
export function timing() {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        // Ensure we have the descriptor that might been overriden by another decorator
        if (descriptor === undefined) { descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) }
        const originalMethod = descriptor.value;
        // Use the function's this context instead of the value of this when log is called (no arrow function)
        descriptor.value = function (...args: any[]) {
            // const parametersAsString = args.map((parameter) => JSON.stringify(parameter)).join(",");
            perf.mark(propertyKey)
            const result = originalMethod.apply(this, args); // Call the original method
            perf.mark(propertyKey)
            return result;
        };
        return descriptor;
    };
}