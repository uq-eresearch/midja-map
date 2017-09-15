import R from 'ramda'
import 'intl'
import 'intl/locale-data/jsonp/en.js'

const locale = ['en-au']
const defaultFormat = new Intl.NumberFormat(locale, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})
const numberFormat = R.memoize(function(fmt) {
  try {
    return fmt && new Intl.NumberFormat(locale, fmt);
  } catch (e) {
    return null;
  }
})

function formatNumber(n: any, fmt: object): string {
  const formatter: Intl.NumberFormat = (numberFormat(fmt) || defaultFormat);
  if (R.is(Number, n) && isFinite(n) && formatter) {
    return formatter.format(n)
  } else if (R.isNil(n)) {
    return '\u2014'
  } else {
    switch (n) {
      case Number.POSITIVE_INFINITY:  return '\u221E';
      case Number.NEGATIVE_INFINITY:  return '-\u221E';
      default:
        return n+''
    }
  }
}

export { formatNumber }
