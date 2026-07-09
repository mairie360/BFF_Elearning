import fs from 'fs';
import path from 'path';
import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from '../src/openapi-registry';

function listRouteFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listRouteFiles(entryPath);
    }

    if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      return [entryPath];
    }

    return [];
  });
}

// Important : il faut importer les routes pour qu'elles s'enregistrent dans le `registry`.
listRouteFiles(path.join(__dirname, '../src/routes')).forEach((file) => {
  require(file);
});

const generator = new OpenApiGeneratorV3(registry.definitions);

const openApiDocument = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'BFF E-learning API',
    version: '1.0.0',
    description: 'Contrat généré automatiquement via Zod',
  },
  servers: [
    {
      url: `http://${process.env.HOST ?? 'localhost'}:${process.env.PORT ?? 4006}`,
      description: 'Serveur local',
    },
  ],
});

const outputPath = path.join(process.cwd(), 'openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2));

console.log('✅ openapi.json a été généré avec succès !');
