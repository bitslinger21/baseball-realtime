import { getGlobalDispatcher } from 'undici';
import { initNestApp } from '../src/bootstrap/bootstrap';
import { generateSpec, saveSpec } from '../src/utils/openapi';

function dumpOpenHandles(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handles: any[] = (process as unknown as { _getActiveHandles(): any[] })._getActiveHandles();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests: any[] = (process as unknown as { _getActiveRequests(): any[] })._getActiveRequests?.() ?? [];
  console.log('Active handles:', handles);
  console.log('Active requests:', requests);
}

async function shutdownHttp() {
  const disp = getGlobalDispatcher();
  // Dispatcher in Undici has .close() – await it to tear down sockets.
  // No-op if already closed.
  if (typeof disp.close === 'function') await disp.close();
}

async function execute() {
  const app = await initNestApp();

  const spec = generateSpec(app);
  saveSpec(spec);
  shutdownHttp().catch((error) => console.error(error));
  app.close().catch((error) => console.error(error));
  // dumpOpenHandles();
}

execute().catch((error) => console.error(error));

