
import { getProp, getObjectTypes } from "../metadata.ts"
import { expect }  from 'https://deno.land/x/expect/mod.ts'
// import { JSONSchema7Definition }  from "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/json-schema/index.d.ts"


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



// console.log(JSON.stringify(p))

Deno.test( {
    name: '01 - Types should be inferred correctly', 
    fn: async () => {
        let p: any  = getObjectTypes('ProductType', products)
        expect(p.properties!.productCode.type).toEqual("symbol")
        expect(p.properties!.productName.type).toEqual("string")
        expect(p.properties!.quantityInStock.type).toEqual("number")
        expect(p.properties!.productLine.properties.image.type).toEqual("null")
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
        let p: any  = getObjectTypes('Employee', employee)
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
        let p: any  = getObjectTypes('Employee', employee2)
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
    renderFunc: Function;
    genFunc: Function;
    typedArray: Int8Array;
} // End of productlinesType

let productLine2: ProductlinesType2 =   {
    productLine: "Guitars",
    textDescription: "Music Store Inc.",
    htmlDescription: "<p>Deine Mega Store<p>",
    renderFunc: () => { console.log( "Bitte, do nothing" ) },
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
        let p: any  = getObjectTypes('ProductLine', productLine2)
        expect( p.properties!.renderFunc.type ).toEqual('function')
        expect( p.properties!.genFunc.type ).toEqual('function')
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
        let p: any  = getObjectTypes('ProductLine3', productLine3)  
        expect( p.properties!.image.type ).toEqual('Image')
        expect( p.properties!.image2.type ).toEqual('Image2')
        expect( p.properties!.images.items.type[1] ).toEqual('Image2')
        // expect( p.required.includes('images')).toEqual(true)  
        console.log(JSON.stringify(p,undefined,2))
    },
    sanitizeResources: false,
    sanitizeOps: false
})
