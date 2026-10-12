module.exports = {
    testDir: '.',
    testMatch: 'test_tour_flow.js',
    timeout: 120000,
    use: {
        headless: false,
        baseURL: 'http://localhost:8000',
        slowMo: 600,
        viewport: { width: 1400, height: 900 },
    },
    reporter: [['list']],
    workers: 1,
};
