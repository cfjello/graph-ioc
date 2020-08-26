let index           = new Map<number, Map<string, any>>()

type T1 = {
    f1: string
}

type T2 = {
    f2: string
}

type T3 = {
    extraField: boolean
}

let objT1: T1 & T3 = { f1:'f1', extraField: false }

let objAll: T1 & T2 & T3 = { f1:'f1', f2: 'f2', extraField: false }


function addObject(firstKey: number = 0, secondKey: string, obj: any) {
    if ( ! index.has(firstKey) ) { index.set(firstKey, new Map<string, any>() ) }
    (index.get(firstKey)!).set(secondKey, obj)
}


addObject(1, 'entry1', objT1)
console.log(index.get(1)!.get('entry1'))

addObject(2, 'entry2',objAll)
let _objAll: T1 & T2 & T3  = index.get(2)!.get('entry2')
_objAll.extraField = true
console.log(_objAll)

addObject(1, 'entry1', objAll) 
console.log( index.get(1)!.get('entry1'))