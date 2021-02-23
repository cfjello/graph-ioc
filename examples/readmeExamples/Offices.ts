import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import {ctrl, Action, action} from "../../cxctrl/mod.ts"
import { ee } from "../../cxutil/mod.ts"

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


