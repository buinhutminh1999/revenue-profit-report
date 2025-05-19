const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api', // Đường dẫn thay thế
    createProxyMiddleware({
      target: 'https://office.base.vn', // Domain gốc của API
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // Bỏ prefix "/api" để gọi chính xác endpoint
      },
    })
  );
};
