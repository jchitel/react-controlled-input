// configure enzyme adapter for react 16.3+
var enzyme = require('enzyme');
var Adapter = require('enzyme-adapter-react-16.3');
enzyme.configure({ adapter: new Adapter() });
