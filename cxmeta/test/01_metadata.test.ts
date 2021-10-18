
import { getTypes } from "../metadata.ts"
import { expect }  from 'https://deno.land/x/expect/mod.ts'



function G() { }

let H = new Function( 'a', 'b' , 'console.log( "Bitte, do nothing" )')
let J = () => { }
let K = function() { }

// console.log(Object.getOwnPropertyDescriptor(G, 'prototype'));
// {"value":{},"writable":true,"enumerable":false,"configurable":false}

let functionProperties0 = {
    field_01: async function(){ return 1 },
    field_02: function getField_01() { return 1},
    field_03: new Function( 'a', 'b' , 'console.log( "Bitte, do nothing" )'),
    field_04: () => { return 1 },
    field_05: G,
    // field_09: decodeURIComponent(encodeURIComponent('шеллы')),
}


Deno.test( {
    name: '00 - Funtion Properties inferred correctly', 
    fn: async () => {
        let p: any  = getTypes('functionProperties', functionProperties0)
        expect(p.properties!.field_01.type).toEqual("AsyncFunction")
        expect(p.properties!.field_02.type).toEqual("function")
        expect(p.properties!.field_03.type).toEqual("Function")
        expect(p.properties!.field_04.type).toEqual("function")
        expect(p.properties!.field_05.type).toEqual("function")
        /*
        expect(p.properties!.field_03.type).toEqual("boolean")
        expect(p.properties!.field_04.type).toEqual("boolean")
        expect(p.properties!.field_05.type).toEqual("number")
        expect(p.properties!.field_06.type).toEqual("string")
        expect(p.properties!.field_07.type).toEqual("string")
        expect(p.properties!.field_08.type).toEqual("string")
        expect(p.properties!.field_09.type).toEqual("string")
        */
        // console.log(JSON.stringify(p,undefined,2))
    },
    sanitizeResources: false,
    sanitizeOps: false
})


let valueProperties = {
    field_01: Infinity,
    field_02: NaN,
    field_03: undefined,
    field_04: globalThis
}

Deno.test( {
    name: '01 - Value Properties inferred correctly', 
    fn: async () => {
        let p: any  = getTypes('valueProperties', valueProperties)
        expect(p.properties!.field_01.type).toEqual("number")
        expect(p.properties!.field_02.type).toEqual("number")
        expect(p.properties!.field_03.type).toEqual("undefined")
        expect(p.properties!.field_04.type).toEqual("Window")
    },
    sanitizeResources: false,
    sanitizeOps: false
})

let functionProperties = {
    field_01: eval('2 + 2'),
    field_02: parseInt('0xF', 16) ,
    field_03: isFinite(1000 / 17),
    field_04: isNaN( NaN ),
    field_05: parseFloat( '4.567' ) * 2.0 * Math.PI,
    field_06: encodeURI('https://mozilla.org/?x=шеллы'),
    field_07: decodeURI(encodeURI('https://mozilla.org/?x=шеллы')),
    field_08: encodeURIComponent('шеллы'),
    field_09: decodeURIComponent(encodeURIComponent('шеллы')),

}

Deno.test( {
    name: '02 - Funtion Properties inferred correctly', 
    fn: async () => {
        let p: any  = getTypes('functionProperties', functionProperties)
        expect(p.properties!.field_01.type).toEqual("number")
        expect(p.properties!.field_02.type).toEqual("number")
        expect(p.properties!.field_03.type).toEqual("boolean")
        expect(p.properties!.field_04.type).toEqual("boolean")
        expect(p.properties!.field_05.type).toEqual("number")
        expect(p.properties!.field_06.type).toEqual("string")
        expect(p.properties!.field_07.type).toEqual("string")
        expect(p.properties!.field_08.type).toEqual("string")
        expect(p.properties!.field_09.type).toEqual("string")

        // console.log(JSON.stringify(p,undefined,2))
    },
    sanitizeResources: false,
    sanitizeOps: false
})

let arrayTypes = {
    field_01: new Int8Array(8),
    field_02: new Uint8Array(8),
    field_03: new Uint8ClampedArray(8),
    field_04: new Int16Array(8),
    field_05: new Float32Array(8),
    field_06: new Float64Array(8),
    field_07: new Uint32Array(8),
    field_08: new BigInt64Array(8),
    field_09: new BigUint64Array(8),
}

Deno.test( {
    name: '03 - Array Properties inferred correctly', 
    fn: async () => {
        let p: any  = getTypes('arrayTypes', arrayTypes)
        expect(p.properties!.field_01.type).toEqual("Int8Array")
        expect(p.properties!.field_02.type).toEqual("Uint8Array")
        expect(p.properties!.field_03.type).toEqual("Uint8ClampedArray")
        expect(p.properties!.field_04.type).toEqual("Int16Array")
        expect(p.properties!.field_05.type).toEqual("Float32Array")
        expect(p.properties!.field_06.type).toEqual("Float64Array")
        expect(p.properties!.field_07.type).toEqual("Uint32Array")
        expect(p.properties!.field_08.type).toEqual("BigInt64Array")
        expect(p.properties!.field_09.type).toEqual("BigUint64Array")

        // console.log(JSON.stringify(p,undefined,2))
    },
    sanitizeResources: false,
    sanitizeOps: false
})

let keyedTypes = {
    field_01: new Map(),
    field_02: new Set().add({a: 1, b: 2}),
    field_03: new WeakMap(),
    field_04: new WeakSet().add({a: 1, b: 2}),
}

Deno.test( {
    name: '04 - Keyed Collections are inferred correctly', 
    fn: async () => {
        let p: any  = getTypes('keyedTypes', keyedTypes)
        expect(p.properties!.field_01.type).toEqual("Map")
        expect(p.properties!.field_02.type).toEqual("Set")
        expect(p.properties!.field_03.type).toEqual("WeakMap")
        expect(p.properties!.field_04.type).toEqual("WeakSet")
        // console.log(JSON.stringify(p,undefined,2))
    },
    sanitizeResources: false,
    sanitizeOps: false
})

let structuredData = {
    field_01: new Int8Array(8),
    field_02: new Uint8Array(8),
    field_03: new Uint8ClampedArray(8),
    field_04: new Int16Array(8),
    field_05: new Float32Array(8),
    field_06: new Float64Array(8),
    field_07: new Uint32Array(8),
    field_08: new BigInt64Array(8),
    field_09: new BigUint64Array(8),
}

Deno.test( {
    name: '05 - structuredData is inferred correctly', 
    fn: async () => {
        let p: any  = getTypes('structuredData', structuredData)
        expect(p.properties!.field_01.type).toEqual("Int8Array")
        expect(p.properties!.field_02.type).toEqual("Uint8Array")
        expect(p.properties!.field_03.type).toEqual("Uint8ClampedArray")
        expect(p.properties!.field_04.type).toEqual("Int16Array")
        expect(p.properties!.field_05.type).toEqual("Float32Array")
        expect(p.properties!.field_06.type).toEqual("Float64Array")
        expect(p.properties!.field_07.type).toEqual("Uint32Array")
        expect(p.properties!.field_08.type).toEqual("BigInt64Array")
        expect(p.properties!.field_09.type).toEqual("BigUint64Array")

        // console.log(JSON.stringify(p,undefined,2))
    },
    sanitizeResources: false,
    sanitizeOps: false
})

/* HER TIL
let controlAbstractionTypes = {
    field_01: new Int8Array(8),
    field_02: new Uint8Array(8),
    field_03: new Uint8ClampedArray(8),
    field_04: new Int16Array(8),
    field_05: new Float32Array(8),
    field_06: new Float64Array(8),
    field_07: new Uint32Array(8),
    field_08: new BigInt64Array(8),
    field_09: new BigUint64Array(8),
}

Deno.test( {
    name: '06 - controlAbstractionTypes are inferred correctly', 
    fn: async () => {
        let p: any  = getTypes('controlAbstractionTypes', controlAbstractionTypes)
        expect(p.properties!.field_01.type).toEqual("Int8Array")
        expect(p.properties!.field_02.type).toEqual("Uint8Array")
        expect(p.properties!.field_03.type).toEqual("Uint8ClampedArray")
        expect(p.properties!.field_04.type).toEqual("Int16Array")
        expect(p.properties!.field_05.type).toEqual("Float32Array")
        expect(p.properties!.field_06.type).toEqual("Float64Array")
        expect(p.properties!.field_07.type).toEqual("Uint32Array")
        expect(p.properties!.field_08.type).toEqual("BigInt64Array")
        expect(p.properties!.field_09.type).toEqual("BigUint64Array")

        // console.log(JSON.stringify(p,undefined,2))
    },
    sanitizeResources: false,
    sanitizeOps: false
})
*/

 type ProductlinesType = {
    productLine: string;
    textDescription?: string;
    htmlDescription?: string;
    image?: string | null;
} // End of productlinesType


export type ProductsType = {
    productCode: symbol;
    productName: string;
    productLine: ProductlinesType;
    productScale: string;
    productVendor: string;
    productDescription: string;
    quantityInStock: number;
    buyPrice: number;
    MSRP: number;
} // End of productsType

let products: ProductsType = {
    productCode: Symbol("ID"),
    productName: "Guitarstring",
    productLine: {
        productLine: "Music",
        textDescription: "Music Store Inc.",
        htmlDescription: "<p>Deine Mega Store ins Germania<p>",
        image: null,
    },
    productScale: "46",
    productVendor: "Fender",
    productDescription: "A-String",
    quantityInStock:999,
    buyPrice: 10,
    MSRP: 999,
}

Deno.test( {
    name: '01 - Types should be inferred correctly', 
    fn: async () => {
        let p: any  = getTypes('ProductType', products)
        expect(p.properties!.productCode.type).toEqual("symbol")
        expect(p.properties!.productName.type).toEqual("string")
        expect(p.properties!.quantityInStock.type).toEqual("number")
        expect(p.properties!.productLine.properties.image.type).toEqual("null")
        // console.log(JSON.stringify(p,undefined,2))
    },
    sanitizeResources: false,
    sanitizeOps: false
})

enum Direction {
    Up,
    Down,
    Out,
 }

enum DirectionText {
    Up = "UP",
    Down = "DOWN",
    Out = "OUT",
}     

export type EmployeesType = {
    recId: Symbol,
	employeeNumber: bigint;
	lastName: string;
	firstName: string;
	extension: string;
	email: string;
	officeCode: string | undefined;
	reportsTo?: number | null;
    jobTitle: string;
    hired: Date;
    active: boolean;
    regexp: RegExp,
    tools: string[],
    /* @type enum */
    score: Direction,
    scoreText: DirectionText,
    error: Error,
    infinit: any;
    nan: any;


} // End of employeesType

let employee: EmployeesType = {
    recId: Symbol('REC-ID'),
    employeeNumber: BigInt(9007199254740991),
	lastName: "Hope",
	firstName: "Bob",
	extension: "A",
	email: "bob.hope@heaven.com",
	officeCode: undefined,
	reportsTo: null,
    jobTitle: "BS Manager",
    hired: new Date(2018, 11, 24, 10, 33, 30, 0),
    active: true,
    regexp: /^.*XXX.*$/,
    tools: ['pen', 'table', 'laptop'],
    score: Direction.Up,
    scoreText: DirectionText.Up,
    error: new Error('Assigning blame'),
    infinit: Infinity,
    nan: NaN
}

Deno.test( {
    name: '01 - Javascript specific Types should be inferred correctly', 
    fn: async () => {
        let p: any  = getTypes('Employee', employee)
        expect(p.properties!.recId.type).toEqual("symbol")
        expect(p.properties!.lastName.type).toEqual("string")
        expect(p.properties!.employeeNumber.type).toEqual("bigint")
        expect(p.properties!.officeCode.type).toEqual("undefined")
        expect(p.properties!.hired.type).toEqual("Date")
        expect(p.properties!.regexp.type).toEqual("RegExp")
        expect(p.properties!.tools.type).toEqual("Array")
        expect(p.properties!.tools.items.type).toEqual("string")
        expect( p.properties!.error.type ).toEqual('Error')
        expect( p.properties!.infinit.type ).toEqual('number')
        expect( p.properties!.nan.type ).toEqual('number')
    },
    sanitizeResources: false,
    sanitizeOps: false
})

export type EmployeesType2 = {
    recId: Symbol,
	employeeNumber: bigint;
	lastName: string;
	firstName: string;
	extension: string;
	email: string;
	officeCode: string | undefined;
	reportsTo?: number | null;
    jobTitle: string;
    hired: Date;
    active: boolean;
    regexp: RegExp,
    tools: any[],
    score: Direction,
    scoreText: DirectionText
} // End of employeesType

let employee2: EmployeesType2 = {
    recId: Symbol('REC-ID'),
    employeeNumber: BigInt(9007199254740991),
	lastName: "Hope",
	firstName: "Bob",
	extension: "A",
	email: "bob.hope@heaven.com",
	officeCode: undefined,
	reportsTo: null,
    jobTitle: "BS Manager",
    hired: new Date(2018, 11, 24, 10, 33, 30, 0),
    active: true,
    regexp: /^.*XXX.*$/,
    tools: ['pen', 10, Symbol('ARR-ID')],
    score: Direction.Up,
    scoreText: DirectionText.Up,
}


Deno.test( {
    name: '01 - Javascript multiple typed should be inferred correctly', 
    fn: async () => {
        let p: any  = getTypes('Employee', employee2)
        expect( Array.isArray(p.properties!.tools.items.type) ).toEqual(true)
        expect( p.properties!.tools.items.type[0] ).toEqual('string')
        expect( p.properties!.tools.items.type[1] ).toEqual('number')
        expect( p.properties!.tools.items.type[2] ).toEqual('symbol')

    },
    sanitizeResources: false,
    sanitizeOps: false
})

type ProductlinesType2 = {
    productLine: string;
    textDescription?: string;
    htmlDescription?: string;
    renderFunc: Function,
    genFunc: Function;
    typedArray: Int8Array;
} // End of productlinesType

let productLine2: ProductlinesType2 =   {
    productLine: "Guitars",
    textDescription: "Music Store Inc.",
    htmlDescription: "<p>Deine Mega Store<p>",
    renderFunc: new Function( 'a', 'b' , 'console.log( "Bitte, do nothing" )'),
    genFunc: function* generator() {
        yield 1;
        yield 2;
        yield 3;
      },
    typedArray: new Int8Array(8)
}

Deno.test( {
    name: '01 - Javascript functions should be inferred correctly', 
    fn: async () => {
        let p: any  = getTypes('ProductLine', productLine2)
        expect( p.properties!.renderFunc.type ).toEqual('Function')
        expect( p.properties!.genFunc.type ).toEqual('GeneratorFunction')
        expect( p.properties!.typedArray.type ).toEqual('Int8Array')
    },
    sanitizeResources: false,
    sanitizeOps: false
})


class Image {
    constructor( public name: string, public format: string  = "jpeg") {}
    getName() { return this.name }
    setName(name: string) { this.name = name}
}


class Image2 extends Image {
    public score = 0
    constructor( name: string, format: string  = "jpeg") { 
        super(name, format )
    }
    getScore() { return this.score }
    setScore(points: number) { this.score += points}
}


let productLine3 =   {
    productLine: "Guitars",
    textDescription: "Music Store Inc.",
    htmlDescription: "<p>Deine Mega Store<p>",
    image: new Image('Mona Lisa'),
    image2: new Image2('Donna Pisa'),
    images: [ new Image('Miss Timbuktu'),  new Image2('Kalinka Moscova') ]
}

Deno.test( {
    name: '01 - Javascript classes should be inferred correctly', 
    fn: async () => {
        let p: any  = getTypes('ProductLine3', productLine3)  
        expect( p.properties!.image.type ).toEqual('Image')
        expect( p.properties!.image2.type ).toEqual('Image2')
        expect( p.properties!.images.items.type[1] ).toEqual('Image2')
        // expect( p.required.includes('images')).toEqual(true)  
        
    },
    sanitizeResources: false,
    sanitizeOps: false
})


Deno.test( {
    name: '01 - Javascript class property types should be inferred correctly', 
    fn: async () => {
        let image = new Image('Mona Lisa')
        let p: any  = getTypes('Image', image)  
        expect( p.properties!.name.type ).toEqual('string')
        expect( p.properties!.format.type ).toEqual('string')
        // expect( p.properties!.setName.type ).toEqual('function')
        
    },
    sanitizeResources: false,
    sanitizeOps: false
})