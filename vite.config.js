import { defineConfig } from 'vite'
import copy from 'rollup-plugin-copy';

export default defineConfig({
    base: '/hunted-estate/',
    build: {
        rollupOptions: {
            plugins: [
            copy({
                targets: [
                    {src: 'resources/**/*', dest: 'dist/resources'}
                ],
                hook: 'writeBundle',
                flatten: false
            })
            ]
        }
    }
});