
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import {ctrl, Action, action} from "../../../cxctrl/mod.ts"
import { ee } from "../../../cxutil/mod.ts"
            
import { OrdersType } from './Orders.model.ts'
import { ProductsType } from './Products.model.ts'
export type OrderdetailsType = {
	orderNumber: number;
	productCode: string;
	quantityOrdered: number;
	priceEach: number;
	orderLineNumber: number;
} // End of orderdetailsType
            

@action({
    name: 'Orderdetails',
    state: [] as OrderdetailsType[],
    init: false
  })
export class Orderdetails extends Action<OrderdetailsType[]> {
    self = this
    filePath = path.resolve(ctrl.__dirname  + "/examples/dynamicRest/resources/" + "orderdetails.data");
    getOrderRef() : Readonly<OrdersType> { return ctrl.getState('Orders') }
    getProductRef() : Readonly<ProductsType> { return ctrl.getState('Products') }

    populate( _filePath: string = this.filePath ) { 
        let dataArr = Deno.readTextFileSync(_filePath).split('\n')
        let jsonData: OrderdetailsType[] = [] as OrderdetailsType[]
        dataArr.forEach(  (_row, idx ) => {
            let row = _row.split(',')
            let obj: OrderdetailsType = {} as OrderdetailsType
            try {
              obj.orderNumber =    +row[0]
              obj.productCode =    row[1].replace(/^['"](.+)['"]$/,'$1')
              obj.quantityOrdered =    +row[2]
              obj.priceEach =    +row[3]
              obj.orderLineNumber =    +row[4]
              this.state.push(obj) 
            }
            catch(e)  { console.log(e) }
        }) // End of dataArr.forEach
    } // End of populate

    main() {
        this.populate()
        this.publish()
    } // End of main
} // End of Orderdetails
