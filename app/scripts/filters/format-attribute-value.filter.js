import { isNumber } from 'lodash-es'
import { formatNumber } from '../../../lib/attribute/format'

export default function formatAttributeValueFilter() {
  return (v, attribute) => {
    if (isNumber(v)) {
      return formatNumber(v, attribute.format)
    } else {
      return v
    }
  }
}
