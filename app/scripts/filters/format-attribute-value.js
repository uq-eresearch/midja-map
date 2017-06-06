'use strict';

import { isNumber } from 'lodash-es'

angular.module('midjaApp')
  .filter('formatAttributeValue', function (formattingService) {
    return (v, attribute) => {
      if (isNumber(v)) {
        return formattingService.formatNumber(v, attribute.format)
      } else {
        return v
      }
    }
  });
