/**
 * Finds a more specific type for a given property name in an JS object - courtesy of mozilla
 * 
 * @param obj The object to be examined
 * @returns string  The property type 
 */

let inspectObject = (obj: any | null ): string => { 
    if (obj == null) { return 'null' }
    let matchType = typeof obj as string
    let proto = Object.getPrototypeOf(obj)
    //
    // Check for Classes an Functions 
    //
    if ( proto && proto.constructor && proto.constructor.name !== 'Object' ) {
        matchType = proto.constructor.name 
    }
    //
    // Make the destinction between Function and function - in V8 it seems that 
    // Function has a name property value: {"value":"anonymous","writable":false,"enumerable":false,"configurable":true} 
    // where function has a name property value with an actual function name: {"value":"G","writable":false,"enumerable":false,"configurable":true}
    //
    if ( matchType === 'Function' && Object.getOwnPropertyDescriptor(obj, 'name')?.value !== 'anonymous' ) {
        matchType = 'function'
    }
    return matchType;
}

/**
 * Finds the type for a given property name in an object 
 * 
 * @param obj The object to be examined
 * @returns string  The property type 
 */
export function getProp<T, K extends keyof T>( obj: T , key: K ): string {
    let oType = typeof  obj[key] as string
    if ( oType === 'object' || oType === 'function' ) {
        oType = inspectObject(obj[key] as Object).toString() as string
    }
    return oType
}

type PointerType = {
    key:       string,
    entry:     any,
    isArray:   boolean
}

/**
 * Creates a JSON Schema representation of the properties of a javascript object - nested objects will be traversed
 * 
 * @param string  Name to assign for the object/object type 
 * @param obj The object to be examined
 * @returns Object  A json Schema representation of the properties of a javascript object 
 */
export function getObjectTypes<T>(  name: string, obj: T  ): Object {
    let res = {
        $schema: "http://js-schema.org/draft-07/js-schema#",
        $id: `http://example.com/${name}.schema.json`,
        title: name,
        type: "object",
        properties: {},
        // required: []
    }
    let pointers : PointerType[] = []
    let parents: number[] = []
    let pIdx = 0 
    pointers[pIdx] = {key: 'root', entry: res, isArray: false } as PointerType
    let p = pointers[pIdx] // the current active element
    parents[pIdx] = pIdx // First entry has no parent

    let nextLevel = (_p: PointerType, key: string, isArray: boolean = false): void => {
        let parentIdx = pIdx
        pIdx = pointers.length
        pointers[pIdx] = { key: key, entry: _p.entry.properties[key], isArray: isArray} as PointerType
        p = pointers[pIdx]
        parents[pIdx] = parentIdx
    }

    let prevLevel = (): void => {
        if ( pIdx < 0 || pIdx >= parents.length ) throw Error(`Pointer index ${pIdx} is out of range`)
        let parentIdx = parents[pIdx]
        p = pointers[parentIdx] 
    }

    function gt<T>( obj: T ): void {
        type objKeys = keyof T
        for ( let key in obj ) {
            let propType = getProp( obj, key as objKeys )
            if ( propType === 'object' ) {
                p.entry.properties[key] =  {
                     type: propType,
                     properties: {},
                     // required: []
                    }
                nextLevel(p, key)
                gt( obj[key] )
                prevLevel()
            }
            else if ( propType === 'Array' ) {
                p.entry.properties[key] =  {
                    type: propType,
                    items: {}
                   }
                // let parent = parents[pIdx]
                // pointers[parent].entry.required.push[key]
                nextLevel(p, key, true)
                gt( obj[key] )
                prevLevel()
            }
            else {       
                if ( p.isArray )  {
                    if ( ! p.entry.items.type ) {
                        p.entry.items.type = propType
                    }
                    else {
                        if ( Array.isArray(p.entry.items.type) && ! p.entry.items.type.includes(propType) ) {
                            p.entry.items.type.push(propType)
                        }
                        else if ( propType !== p.entry.items.type ) {
                            p.entry.items.type = [ p.entry.items.type, propType ] 
                        }
                    }
                }
                else 
                    p.entry.properties[key] =  { 
                        type: propType
                    }            
            }
        }
    }
    // Make the first call
    gt(obj)
    return res
}