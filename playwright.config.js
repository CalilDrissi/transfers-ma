module.exports = {
    testDir: '.',
    testMatch: 'test_payment.js',
    timeout: 120000,
    use: {
        headless: false,
        baseURL: 'https://transfers.ma',
    },
};
