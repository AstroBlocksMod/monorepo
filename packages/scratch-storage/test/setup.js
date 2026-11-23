const fs = require('fs');

// Equivalent of webpack's arraybuffer-loader for running the source directly in Node.
for (const extension of ['.png', '.svg', '.wav']) {
    require.extensions[extension] = (module, filename) => {
        module.exports = fs.readFileSync(filename);
    };
}
