export interface StateDataIntf {
    found: boolean, 
    state: any, 
    msg: string
}

export interface publishIntf {
    params: { stateName: string, id: string }; 
    request: any; 
    response: any;
  }