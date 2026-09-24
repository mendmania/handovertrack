import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'../tests/web',fullyParallel:false,workers:1,timeout:60000,use:{baseURL:process.env.WEB_ORIGIN,trace:'off',screenshot:'off',video:'off'},outputDir:process.env.REPORT_TEST_OUTPUT ? process.env.REPORT_TEST_OUTPUT+'/browser-results' : '../.local/task08/browser-results'});
