import { Router } from "https://deno.land/x/oak/mod.ts";

import {
  getState,
  getStateById,
  // publishState
  // addState,
  // updateState,
  // deleteState,
} from "./controller.ts";

export const router = new Router();

router.get("/:stateName", getState)
  .get("/:stateName/:id", getStateById)
  // .post("/:state", addState)
  // .put("/:state/:id", publishState)
  // .delete("/:state/:id", deleteState);

export default router;