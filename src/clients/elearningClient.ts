// src/clients/elearningClient.ts
import createClient from "openapi-fetch";
import type { paths } from "@mairie360/elearning-api-openapi"; 

const elearningClient = createClient<paths>({ 
    baseUrl: process.env.ELEARNING_API_URL 
});

export default elearningClient;