
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import {ctrl, Action, action} from "../../../cxctrl/mod.ts"
import { ee } from "../../../cxutil/mod.ts"
            
import { CustomersType } from './Customers.model.ts'
import { OfficesType } from './Offices.model.ts'
export type EmployeesType = {
	employeeNumber: number;
	lastName: string;
	firstName: string;
	extension: string;
	email: string;
	officeCode: string;
	reportsTo?: number;
	jobTitle: string;
} // End of employeesType
            

@action({
    name: 'Employees',
    state: [] as EmployeesType[],
    init: false
  })
export class Employees extends Action<EmployeesType[]> {
    self = this
    filePath = path.resolve(ctrl.__dirname  + "/examples/dynamicRest/resources/" + "employees.data");

    getOfficeRef() : Readonly<OfficesType> { return ctrl.getState('Offices') }

    populate( _filePath: string = this.filePath ) { 
        let dataArr = Deno.readTextFileSync(_filePath).split('\n')
        let jsonData: EmployeesType[] = [] as EmployeesType[]
        dataArr.forEach(  (_row, idx ) => {
            let row = _row.split(',')
            let obj: EmployeesType = {} as EmployeesType
            try {
              obj.employeeNumber =    +row[0]
              obj.lastName =    row[1].replace(/^['"](.+)['"]$/,'$1')
              obj.firstName =    row[2].replace(/^['"](.+)['"]$/,'$1')
              obj.extension =    row[3].replace(/^['"](.+)['"]$/,'$1')
              obj.email =    row[4].replace(/^['"](.+)['"]$/,'$1')
              obj.officeCode =    row[5].replace(/^['"](.+)['"]$/,'$1')
              obj.reportsTo =   row[6] === 'NULL' ? undefined : +row[6]
              obj.jobTitle =    row[7].replace(/^['"](.+)['"]$/,'$1')
              this.state.push(obj) 
            }
            catch(e)  { console.log(e) }
        }) // End of dataArr.forEach
    } // End of populate

    main() {
        this.populate()
        this.publish()
    } // End of main
} // End of Employees
