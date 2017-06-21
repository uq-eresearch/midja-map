import { isNumber } from 'lodash-es'

export default function formatAttributeValueFilter(formattingService) {
  return (v, attribute) => {
    if (isNumber(v)) {
      return formattingService.formatNumber(v, attribute.format)
    } else {
      return v
    }
  }
}
