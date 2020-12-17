
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import {ctrl, Action, action} from "../../../cxctrl/mod.ts"
import { ee } from "../../../cxutil/mod.ts"
            
import { OrderdetailsType } from './Orderdetails.model.ts'
import { ProductlinesType } from './Productlines.model.ts'
export type ProductsType = {
	productCode: string;
	productName: string;
	productLine: string;
	productScale: string;
	productVendor: string;
	productDescription: string;
	quantityInStock: number;
	buyPrice: number;
	MSRP: number;
} // End of productsType
            

@action({
    name: 'Products',
    state: [] as ProductsType[],
    init: false
  })
export class Products extends Action<ProductsType[]> {
    self = this
    filePath = path.resolve(ctrl.__dirname  + "/examples/dynamicRest/resources/" + "products.data");
    getProductlineRef() : Readonly<ProductlinesType> { return ctrl.getState('Productlines') }
    getOrderdetailsRef() : Readonly<ProductsType[]> { return ctrl.getState('Orderdetails') }

    populate( _filePath: string = this.filePath ) { 
        let dataArr = Deno.readTextFileSync(_filePath).split('\n')
        let jsonData: ProductsType[] = [] as ProductsType[]
        dataArr.forEach(  (_row, idx ) => {
            let row = _row.split(',')
            let obj: ProductsType = {} as ProductsType
            try {
              obj.productCode =    row[0].replace(/^['"](.+)['"]$/,'$1')
              obj.productName =    row[1].replace(/^['"](.+)['"]$/,'$1')
              obj.productLine =    row[2].replace(/^['"](.+)['"]$/,'$1')
              obj.productScale =    row[3].replace(/^['"](.+)['"]$/,'$1')
              obj.productVendor =    row[4].replace(/^['"](.+)['"]$/,'$1')
              obj.productDescription =    row[5].replace(/^['"](.+)['"]$/,'$1')
              obj.quantityInStock =    +row[6]
              obj.buyPrice =    +row[7]
              obj.MSRP =    +row[8]
              this.state.push(obj) 
            }
            catch(e)  { console.log(e) }
        }) // End of dataArr.forEach
    } // End of populate

    main() {
        this.populate()
        this.publish()
    } // End of main
} // End of Products
