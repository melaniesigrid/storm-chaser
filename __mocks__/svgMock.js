/**
 * Metro turns `.svg` imports into React components via
 * react-native-svg-transformer. Jest does not run Metro, so every Meteocons
 * import would resolve to raw SVG text and fail. This stands in for the
 * component; the suite only ever asserts on the icon NAME mapping, which is
 * pure, so a stub is enough.
 */
const React = require('react');

module.exports = {
  __esModule: true,
  default: (props) => React.createElement('SvgMock', props),
};
