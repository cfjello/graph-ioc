import { defineStateTypes, defineObjectTypes, Reflect } from "../mod.ts"
import { expect }  from 'https://deno.land/x/expect/mod.ts'

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
    error: new Error('Assigning blame'),
    infinit: Infinity,
    nan: NaN
}

Deno.test( {
    name: '01 - Metadata Types should be stored correctly', 
    fn: async () => {
        defineObjectTypes<any>('Employee:types', employee)
        expect(Reflect.hasMetadata('Employee:types', employee)).toBeTruthy()
        let t = Reflect.getMetadata('Employee:types', employee )
        expect(t).toBeDefined()
        // Check the structure
        let p = t.properties
        expect(p.recId.type).toEqual("symbol")
        expect(p.lastName.type).toEqual("string")
        expect(p.employeeNumber.type).toEqual("bigint")
        expect(p.officeCode.type).toEqual("undefined")
        expect(p.hired.type).toEqual("Date")
        expect(p.regexp.type).toEqual("RegExp")
        expect(p.tools.type).toEqual("Array")
        expect(p.tools.items.type).toEqual("string")
        expect( p.error.type ).toEqual('Error')
        expect( p.infinit.type ).toEqual('number')
        expect( p.nan.type ).toEqual('number')
    },
    sanitizeResources: false,
    sanitizeOps: false
})