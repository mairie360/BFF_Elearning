import axios from 'axios';
import { getCoreApi } from '@mairie360/core-api-openapi/endpoints/coreApi';

function getCoreApiBaseUrl(): string {
  const configuredUrl = process.env.CORE_API_URL ?? 'localhost';
  const baseUrl = /^https?:\/\//i.test(configuredUrl) ? configuredUrl : `http://${configuredUrl}`;
  const url = new URL(baseUrl);

  if (!url.port && process.env.CORE_API_PORT) {
    url.port = process.env.CORE_API_PORT;
  }

  return url.toString().replace(/\/$/, '');
}

const coreApiAxios = axios.create({
  baseURL: getCoreApiBaseUrl(),
  timeout: 5_000,
});

const coreClient = getCoreApi(coreApiAxios);

export default coreClient;
