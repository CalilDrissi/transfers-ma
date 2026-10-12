module.exports = {
    testDir: '.',
    testMatch: 'test_e2e_full.js',
    timeout: 90000,
    use: {
        headless: true,
        baseURL: 'http://localhost:8000',
        video: 'off',
        screenshot: 'only-on-failure',
    },
    reporter: [['list']],
    workers: 1, // sequential — shared state across tests
};
