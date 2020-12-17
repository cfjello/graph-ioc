import { StateDataIntf, publishIntf } from "./interfaces.ts"
import { ctrl } from "../cxctrl/mod.ts"

const getStateData = (  stateName: string, id: string ): StateDataIntf  => {
    let msg = ""
    let _id = id.match(/^\s*(\-1|[0-9]+)\s*$/) ? parseInt(id) : undefined

    let found = ctrl.store.has( stateName )
    console.log(`Fetching ${stateName}/${_id}`)
    let state =  found ? ctrl.store.get(stateName, _id ) : undefined
    if ( ! found || ! state ) {
      msg = `${stateName}[${id}] Not Found`
    }
    return { found: found, state: state, msg: msg }
}

const getState = ({ params, response }: { params: { stateName: string }, response: any }) => {
    let stateData = getStateData( params.stateName, "-1" )
    if ( stateData.found) {
        response.status = 200;
        response.body = {
            success: true,
            data: stateData.state,
        };
    } else {
        response.status = 404;
        response.body = {
            success: false,
            msg: stateData.msg,
        };
    }
};

const getStateById = ( { params, response }: { params: { stateName: string, id: string }; response: any }) => {   
    let stateData = getStateData( params.stateName, params.id )    
    if ( stateData.found) {
        response.status = 200;
        response.body = {
            success: true,
            data: stateData.state,
        };
    } else {
        response.status = 404;
        response.body = {
            success: false,
            msg: stateData.msg,
        };
    }
};
/*
const publish = async ( { params, request, response }: publishIntf ) => {
    let found = ctrl.store.has( params.stateName )
    const value : any  = await request.body()
    // const requestedDinosaur: Dinosaur | undefined = Dinosaurs.find(
    //  (dinosaur: Dinosaur) => dinosaur.id === params.id,
    // );
    if ( found && value !== undefined) {
      const { value : any } = await request.body()
      
      response.status = 200;
      response.body = {
        success: true,
        msg: `Dinosaur id ${params.id} updated`,
      };
    } else {
      response.status = 404;
      response.body = {
        success: false,
        msg: `Not Found`,
      };
    }
  };
*/
/*
const addDinosaur = async (
  { request, response }: { request: any; response: any },
) => {
  if (!request.hasBody) {
    response.status = 400;
    response.body = {
      success: false,
      msg: "No data",
    };
  } else {
    const { value : dinosaurBody } = await request.body();
    const dinosaur: Dinosaur = dinosaurBody;
    dinosaur.id = v4.generate();
    Dinosaurs.push(dinosaur);
    response.status = 201;
    response.body = {
      success: true,
      data: dinosaur,
    };
  }
};

const deleteDinosaur = (
  { params, response }: { params: { id: string }; response: any },
) => {
  const filteredDinosaurs: Array<Dinosaur> = Dinosaurs.filter(
    (dinosaur: Dinosaur) => (dinosaur.id !== params.id),
  );
  if (filteredDinosaurs.length === Dinosaurs.length) {
    response.status = 404;
    response.body = {
      success: false,
      msg: "Not found",
    };
  } else {
    Dinosaurs.splice(0, Dinosaurs.length);
    Dinosaurs.push(...filteredDinosaurs);
    response.status = 200;
    response.body = {
      success: true,
      msg: `Dinosaur with id ${params.id} has been deleted`,
    };
  }
};

const updateDinosaur = async (
  { params, request, response }: {
    params: { id: string };
    request: any;
    response: any;
  },
) => {
  const requestedDinosaur: Dinosaur | undefined = Dinosaurs.find(
    (dinosaur: Dinosaur) => dinosaur.id === params.id,
  );
  if (requestedDinosaur) {
    const { value : updatedDinosaurBody } = await request.body();
    const updatedDinosaurs: Array<Dinosaur> = Dinosaurs.map(
      (dinosaur: Dinosaur) => {
        if (dinosaur.id === params.id) {
          return {
            ...dinosaur,
            ...updatedDinosaurBody,
          };
        } else {
          return dinosaur;
        }
      },
    );

    Dinosaurs.splice(0, Dinosaurs.length);
    Dinosaurs.push(...updatedDinosaurs);
    response.status = 200;
    response.body = {
      success: true,
      msg: `Dinosaur id ${params.id} updated`,
    };
  } else {
    response.status = 404;
    response.body = {
      success: false,
      msg: `Not Found`,
    };
  }
};
*/
export {
    getState,
    getStateById
};