
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import {ctrl, Action, action} from "../../../cxctrl/mod.ts"
import { ee } from "../../../cxutil/mod.ts"
            
import { EmployeesType } from './Employees.model.ts'
export type OfficesType = {
	officeCode: string;
	city: string;
	phone: string;
	addressLine1: string;
	addressLine2?: string;
	state?: string;
	country: string;
	postalCode: string;
	territory: string;
} // End of officesType
            

@action({
    name: 'Offices',
    state: [] as OfficesType[],
    init: false
  })
export class Offices extends Action<OfficesType[]> {
    self = this
    filePath = path.resolve(ctrl.__dirname  + "/examples/dynamicRest/resources/" + "offices.data");
    getEmployeesRef() : Readonly<OfficesType[]> { return ctrl.getState('Employees') }

    populate( _filePath: string = this.filePath ) { 
        let dataArr = Deno.readTextFileSync(_filePath).split('\n')
        let jsonData: OfficesType[] = [] as OfficesType[]
        dataArr.forEach(  (_row, idx ) => {
            let row = _row.split(',')
            let obj: OfficesType = {} as OfficesType
            try {
              obj.officeCode =    row[0].replace(/^['"](.+)['"]$/,'$1')
              obj.city =    row[1].replace(/^['"](.+)['"]$/,'$1')
              obj.phone =    row[2].replace(/^['"](.+)['"]$/,'$1')
              obj.addressLine1 =    row[3].replace(/^['"](.+)['"]$/,'$1')
              obj.addressLine2 =   row[4] === 'NULL' ? undefined : row[4].replace(/^['"](.+)['"]$/,'$1')
              obj.state =   row[5] === 'NULL' ? undefined : row[5].replace(/^['"](.+)['"]$/,'$1')
              obj.country =    row[6].replace(/^['"](.+)['"]$/,'$1')
              obj.postalCode =    row[7].replace(/^['"](.+)['"]$/,'$1')
              obj.territory =    row[8].replace(/^['"](.+)['"]$/,'$1')
              this.state.push(obj) 
            }
            catch(e)  { console.log(e) }
        }) // End of dataArr.forEach
    } // End of populate

    main() {
        this.populate()
        this.publish()
    } // End of main
} // End of Offices
