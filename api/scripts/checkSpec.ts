import { initNestApp } from '../src/bootstrap/bootstrap';
import { generateSpec, specMatchesExisting } from '../src/utils/openapi';

async function execute() {
  const app = await initNestApp();

  const spec = generateSpec(app);

  if (!specMatchesExisting(spec)) {
    console.error(
      'OpenAPI spec check: FAILED\nOpenAPI spec does not match saved spec. Run `yarn spec:gen` and commit the updated spec.',
    );
    await app.close();
    process.exit(1);
  }
  console.log('OpenAPI spec check: PASSED');
  await app.close();
  process.exit(0);
}
execute().catch((error) => console.error(error));
