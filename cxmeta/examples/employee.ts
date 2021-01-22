import { getProp, getObjectTypes } from "../metadata.ts"

enum DirectionText { Up = "UP", Down = "DOWN", Out = "OUT" }     

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

let employee  = {
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
    scoreText: DirectionText.Up,
    image: new Image('Office'),
    image2: new Image2('Cubicle'),
    images: [ new Image('Table'),  new Image2('Computer') ]
}

let dataTypes = getObjectTypes('Employee', employee)
console.log(JSON.stringify(dataTypes, undefined, 2))