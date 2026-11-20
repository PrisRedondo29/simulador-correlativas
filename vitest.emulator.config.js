import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.emulator.test.{js,jsx}'],
        environment: 'node',
        testTimeout: 20000,
        hookTimeout: 20000,
        fileParallelism: false,
    },
});
