import { defineConfig } from 'tsup'
// import copy from "esbuild-copy-files-plugin";


export default defineConfig({
    entry: [
        'src/**/*.ts'
    ],
    format: ['esm','cjs'],
    dts: true,
    splitting: true,
    sourcemap: false,
    clean: true,
    treeshake:true,  
    minify: true, 
    banner: {
        js: `/**
*   ---=== FlexTools ===---
*   https://zhangfisher.github.com/flex-tools 
*/`}
}) 