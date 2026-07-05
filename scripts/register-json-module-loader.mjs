import { register } from 'node:module';
import { URL } from 'node:url';

register(new URL('./json-module-loader.mjs', import.meta.url));
