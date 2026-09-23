import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'../tests/web',fullyParallel:false,workers:1,timeout:45000,use:{baseURL:process.env.WEB_ORIGIN,trace:'off',screenshot:'off',video:'off'},outputDir:'../.local/task06/browser-results'});
