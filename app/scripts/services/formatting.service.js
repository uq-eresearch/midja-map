import _ from 'lodash-es'
import 'intl'
import 'intl/locale-data/jsonp/en.js'

export default function formattingService($injector) {
  var service = {};
  var locale = ['en-au'];
  var defaultFormat = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  var numberFormat = _.memoize(function(fmt) {
    try {
      return fmt && new Intl.NumberFormat(locale, fmt);
    } catch (e) {
      return null;
    }
  });

  service.formatNumber = function formattingService$formatNumber(n, fmt) {
    var formatter = (numberFormat(fmt) || defaultFormat);
    if (_.isFinite(n) && formatter) {
      return formatter.format(n);
    } else if (_.isUndefined(n) || _.isNull(n)) {
      return '\u2014';
    } else {
      switch (n) {
        case Number.POSITIVE_INFINITY:  return '\u221E';
        case Number.NEGATIVE_INFINITY:  return '-\u221E';
        default:
          return n+'';
      }
    }
  };

  return service;
}
