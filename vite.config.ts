import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' para que el build funcione servido desde cualquier ruta.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
