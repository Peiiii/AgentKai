import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createWatchNodeModulesPlugin } from './plugins/watch-node-modules';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        createWatchNodeModulesPlugin(['@agentkai'])
    ],
    optimizeDeps: {
        include: ['@agentkai/browser'],
    }
});
