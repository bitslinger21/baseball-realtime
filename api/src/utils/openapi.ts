import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import yaml from 'yaml';
import fs from 'fs';
import { INestApplication, Logger } from '@nestjs/common';
import { version } from '../../package.json';

const YAML_SPEC_PATH = './generated/openapi.yaml';
const JSON_SPEC_PATH = './generated/client/typescript-axios/openapi.json';
const logger: Logger = new Logger('OpenAPI');

export function generateSpec(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Pharmacy API')
    .setDescription('API for pharmacy management')
    .setVersion(version)
    .build();

  logger.log('Generating OpenAPI spec');
  return SwaggerModule.createDocument(app, config, {
    operationIdFactory(controllerKey: string, methodKey: string) {
      // Remove 'Controller' from the generated operation id.
      // The result is something like `Resource_method` and works well for client sdk generation.
      return `${controllerKey.replace('Controller', '')}_${methodKey}`;
    },
  });
}

function readExistingSpec(): string {
  logger.log(`Loading OpenAPI spec at ${YAML_SPEC_PATH}`);
  return fs.readFileSync(YAML_SPEC_PATH, 'utf-8');
}

export function specMatchesExisting(spec: OpenAPIObject): boolean {
  const existingSpecString = readExistingSpec();
  const newSpecString = yaml.stringify(spec);
  return existingSpecString === newSpecString;
}

export function saveSpec(spec: OpenAPIObject) {
  logger.log(`Saving OpenAPI spec to ${YAML_SPEC_PATH}`);
  fs.writeFileSync(YAML_SPEC_PATH, yaml.stringify(spec));

  logger.log(`Saving OpenAPI spec to ${JSON_SPEC_PATH}`);
  fs.writeFileSync(JSON_SPEC_PATH, JSON.stringify(spec, null, 2));
}

export function serveSpec(
  app: INestApplication,
  path: string,
  spec: OpenAPIObject,
) {
  SwaggerModule.setup(path, app, spec);
}
