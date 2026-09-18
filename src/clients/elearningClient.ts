import axios from 'axios';
import { getELearningAPIMairie360 } from '@mairie360/elearning-api-openapi/endpoints/eLearningAPIMairie360';

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

const elearningClient = getELearningAPIMairie360(elearningApiAxios);

export default elearningClient;
