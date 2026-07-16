import axios from 'axios';
import { getElearningApi } from '@mairie360/elearning-api-openapi/endpoints/elearningApi';

function getElearningApiBaseUrl(): string {
  const configuredUrl = process.env.ELEARNING_API_URL ?? 'localhost';
  const baseUrl = /^https?:\/\//i.test(configuredUrl) ? configuredUrl : `http://${configuredUrl}`;
  const url = new URL(baseUrl);

  if (!url.port && process.env.ELEARNING_API_PORT) {
    url.port = process.env.ELEARNING_API_PORT;
  }

  return url.toString().replace(/\/$/, '');
}

const elearningApiAxios = axios.create({
  baseURL: getElearningApiBaseUrl(),
  timeout: 5_000,
});

const elearningClient = getElearningApi(elearningApiAxios);

export default elearningClient;
