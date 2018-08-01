var path = require('path');

// 拼接我们的工作区路径为一个绝对路径
function resolve(dir) {
    return path.join(__dirname, '..', dir);
}

module.exports = {
    entry: resolve('test.js'),
    output: {
        // 编译输出的根路径
        path: 'dist',
        // 编译输出的文件名
        filename: 'bundle.js',
        // 正式发布环境下编译输出的发布路径
        publicPath: './'
    },
    resolve: {
        // 自动补全的扩展名
        extensions: ['.js'],
        modules: [
            resolve('src'),
            resolve('node_modules')
        ]
    },
    externals: {
        'jquery': 'window.jQuery'
    },
    module: {
        rules: [{
            test: /\.js/,
            loader: 'eslint-loader',
            enforce: "pre",
            include: [resolve('src')],
            options: {
                formatter: require('eslint-friendly-formatter')
            }
        }, {
            test: /\.js$/,
            loader: 'babel-loader',
            include: [resolve('src'), resolve('test')]
        }, {
            test: require.resolve('zepto'),
            loader: 'exports-loader?window.Zepto!script-loader'
        }]
    }
}