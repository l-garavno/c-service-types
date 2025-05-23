import dotenv from 'dotenv';
import fs from 'fs';
import { execSync } from 'child_process';

run();

function run() {
  dotenv.config({ path: './.env' });
  const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
  const AWS_PROFILE = process.env.AWS_PROFILE;

  if (!AWS_S3_BUCKET || !AWS_PROFILE) {
    throw new Error('AWS_S3_BUCKET and AWS_PROFILE must be set');
  }
  execSync(
    `aws s3 sync ${AWS_S3_BUCKET}/configs/service-schema/ ./configs/service-schema/ --profile ${AWS_PROFILE}`,
  );
  execSync(`
    mkdir -p src/ts-types
    rm -rf src/ts-types/*.*
  `);

  const files = fs.readdirSync('./configs/service-schema');

  generateTsTypes(files);
  generateSchema(files);

  execSync(
    `aws s3 sync ./configs/schema/ ${AWS_S3_BUCKET}/configs/schema/ --profile ${AWS_PROFILE}`,
  );
}

function generateSchema(files) {
  const baseUrl = process.env.BASE_SCHEMA_URL;
  const base = {
    $id: './base.json#',
    type: 'object',
    oneOf: [],
    required: ['service', 'request', 'response'],
  };
  const C_SERVICES = {
    $id: './C_SERVICES.json#',
    enum: [],
  };
  for (const file of files) {
    const service = toPascalCase(file.replace('.json', ''));
    const schema = _load(file);
    const definitions = schema.definitions || {};
    C_SERVICES.enum.push(service);
    Object.entries(definitions).forEach(([method, definition]) => {
      let ref = definition.properties.service['$ref'];
      ref = ref.replace('./', `${baseUrl}/`);
      definition.properties.service['$ref'] = ref;
      base.oneOf.push({
        $ref: `${baseUrl}/services/${file}#/definitions/${method}`,
      });
    });
    fs.writeFileSync(
      `./configs/schema/services/${file}`,
      JSON.stringify(schema, null, 2),
    );
  }
  fs.writeFileSync(
    `./configs/schema/base.json`,
    JSON.stringify(base, null, 2),
  );
  fs.writeFileSync(
    `./configs/schema/defs/C_SERVICES.json`,
    JSON.stringify(C_SERVICES, null, 2),
  );
}

function generateTsTypes(files) {
  const tab = '  ';
  let index = '';
  for (const file of files) {
    const service = toPascalCase(file.replace('.json', ''));
    const schema = _load(file);
    const definitions = schema.definitions || {};

    const lines = [];
    lines.push(`export type ${service}Service = {`);
    Object.entries(definitions).forEach(([method, definition]) => {
      const paramsType = typeGenerator(
        definition.properties.request.properties.params,
      );
      const responseType = typeGenerator(definition.properties.response);
      lines.push(
        `${tab}${method}: (params: { ${paramsType} }) => Promise<{ ${responseType} }>`,
      );
    });
    lines.push('}\n');
    fs.writeFileSync(
      `./src/ts-types/${toCamelCase(service)}.ts`,
      lines.join('\n'),
    );
    index += `export * from './${toCamelCase(service)}'\n`;
  }

  fs.writeFileSync(`./src/ts-types/index.ts`, index);
}

function typeGenerator({ properties, required }) {
  const requiredObject = Object.fromEntries(
    (required || []).map((key) => [key, 1]),
  );
  return Object.entries(properties)
    .map(([key, value]) => {
      if (requiredObject[key]) {
        return `${key}: ${value.type}`;
      }
      return `${key}?: ${value.type}`;
    })
    .join(', ');
}

function toPascalCase(string) {
  return string.replace(/(?:^|_)(\w)/g, (_, letter) => letter.toUpperCase());
}

function toCamelCase(string) {
  return string.replace(/(?:^|_)(\w)/g, (_, letter) => letter.toLowerCase());
}

function _load(file) {
  return JSON.parse(
    fs.readFileSync(`./configs/service-schema/${file}`, 'utf8'),
  );
}
