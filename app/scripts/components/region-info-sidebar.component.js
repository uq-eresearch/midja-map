import {
  sortByAttributeNameNumbers,
  sortByEducation
} from '../../../lib/attribute/sorters'

const templates = {
  default: require('./templates/region-info-sidebar/default.html'),
  lga_2011: require('./templates/region-info-sidebar/lga_2011.html'),
  lga_2016: require('./templates/region-info-sidebar/lga_2016.html'),
  sa2_2016: require('./templates/region-info-sidebar/sa2_2016.html'),
  sa3_2016: require('./templates/region-info-sidebar/sa3_2016.html')
}

export default {
  template: '<div></div>',
  bindings: {
    regionType: '<',
    region: '<'
  },
  controller: function($compile, $element, $scope) {
    this.sortByAttributeNameNumbers = sortByAttributeNameNumbers
    this.sortByEducation = sortByEducation
    this.$onChanges = (changes) => {
      if (changes.regionType &&
          changes.regionType.currentValue &&
          changes.regionType.currentValue != changes.regionType.previousValue) {
        $element.html(templates[changes.regionType.currentValue] || templates.default)
        $compile($element.contents())($scope)
      }
    }
  },
  controllerAs: 'vm'
}
