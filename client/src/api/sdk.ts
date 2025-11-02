// /client/src/api/sdk.ts
import { Configuration } from "@bitslinger21/baseball-realtime-client";
// Pick the correct API class exported by your SDK.
// If your SDK exports DefaultApi use that; if it exports GamesApi, use that.
// Try GamesApi first; if it’s DefaultApi, change the import & constructor below.
import {  } from "@bitslinger21/baseball-realtime-client";

const basePath = "/api"; // Vite proxy will forward this to your backend in dev

const config = new Configuration({ basePath });
// export const gamesApi = new GamesApi(config);
// If your SDK uses DefaultApi instead:
// import { DefaultApi } from "@bitslinger21/baseball-realtime-client";
// export const gamesApi = new DefaultApi(config);