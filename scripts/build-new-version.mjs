import fs from 'fs';
import { execSync } from 'child_process';
const files = fs.readdirSync('./configs/services-schema');
const schemas = {};

run();

function run() {
  execSync(`
    mkdir -p src/ts-types
    rm -rf src/ts-types/*.*
  `);
  generateTsTypes();
}

function generateTsTypes() {
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
  if (schemas[file]) {
    return schemas[file];
  }
  const schema = JSON.parse(
    fs.readFileSync(`./configs/services-schema/${file}`, 'utf8'),
  );
  schemas[file] = schema;
  return schema;
}
