import { defineConfig } from 'vite'
import copy from 'rollup-plugin-copy';
import glsl from 'vite-plugin-glsl';
import path from 'path'

const root = path.resolve(__dirname, 'src');
const outDir = path.resolve(__dirname, 'dist');

export default defineConfig({
    root: root,
    base: '/stride/',
    plugins: [glsl()],
    build: {
        outDir: outDir,
        emptyOutDir: true,
        rollupOptions: {
            plugins: [
            copy({
                targets: [{src: 'src/resources/**/*', dest: 'dist/'}],
                hook: 'writeBundle',
                flatten: false
            })],
            input: {
                main: path.resolve(root, 'index.html'),
                about: path.resolve(root, 'about', 'index.html')
            }
        }
    }
});