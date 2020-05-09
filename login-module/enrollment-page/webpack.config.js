const path = require('path');

module.exports = {
	entry: './src/index.js',
	output: {
		library: 'GraphAcademyEnrollmentPageV2',
		filename: 'graphacademy-enrollment-v2.js',
		path: path.resolve(__dirname, 'dist'),
	},
};
