import { Action, action} from "../../cxctrl/mod.ts"

//
// First define your Data Object type
//
export type EmployeesType = {
    recId: symbol,
	employeeNumber: number;
	lastName: string;
	firstName: string;
	extension: string;
	email: string;
	officeCode: string | undefined;
	reportsTo?: number | null;
    jobTitle: string;
} 

//
// Then define the action class that owns the data object
//
@action({
    name: 'Employees',
    state: [] as EmployeesType[],
    init: false,
    ctrl: 'main'
})
export class Employees extends Action<EmployeesType[]> {
    addEmployee( employee: EmployeesType) {
        this.state.push(employee)
    }

    show() {
        console.log(JSON.stringify(this.getState(this.meta.name!, -1), undefined, 2))
    }

    main() {} // This is a mandatory function - ignore for now 
}

//
// Now Instantiate the data object and then register it in the Data Store
//
let emp = await new Employees().register()

//
// Now add some data
// 
emp.addEmployee({
    recId: Symbol('REC-ID'),
    employeeNumber: 1,
    lastName: "Doris",
    firstName: "Day",
    extension: "B",
    email: "doris.day@heaven.com",
    officeCode: undefined,
    reportsTo: null,
    jobTitle: "Actress",
    }
)

emp.addEmployee( {
    recId: Symbol('REC-ID'),
    employeeNumber: 2,
    lastName: "Hope",
    firstName: "Bob",
    extension: "A",
    email: "bob.hope@heaven.com",
    officeCode: undefined,
    reportsTo: 1,
    jobTitle: "BS Manager",
    } 
) 

//
// Now publish the data to the Data Store
//
await emp.publish()
//
// Fetch the metadata from the Data Store and write it to console
// 

emp.update( { lastName: 'NoHope', email: 'bob.hope@purgatory.com' } )

emp.show()

//
// Fetch the date from the Data Store and write it to console
// 
emp.showMeta = function() {
    console.log(`${this.meta.className}.meta: ${JSON.stringify(this.meta, undefined, 2)}`)
}

emp.showMeta()

/*
//
// Let us add a function that adds Employees from a csv data file
// 
emp.populate = function( _filePath: string   ) {
    // 
    // Utility functio to remove quotes
    //
    let unQuote = ( str: string) => {  
        return(str.replace(/^['"](.+)['"]$/,'$1'))
    }
    //
    // Read the data file
    //
    let dataArr = Deno.readTextFileSync(_filePath).split('\n')
    let jsonData: EmployeesType[] = [] as EmployeesType[]
    //
    // Read the data file
    //
    dataArr.forEach(  (_row, idx ) => {
        let row = _row.split(',')
        let obj: EmployeesType = {} as EmployeesType
        try {
          obj.recId          = Symbol('REC-ID'),
          obj.employeeNumber = BigInt(+row[0]),
          obj.lastName       = unQuote(row[1])
          obj.firstName      = unQuote(row[2])
          obj.extension      = unQuote(row[3])
          obj.email          = unQuote(row[4])
          obj.officeCode     = unQuote(row[5])
          obj.reportsTo      = row[6] === 'NULL' ? null : +row[6]
          obj.jobTitle       = unQuote(row[7])
          this.state.push(obj) 
        }
        catch(e)  { console.log(e) }
    }) // End of dataArr.forEach
} // End of populate

//
// Now lets overwrite the main function
// 
*/ 