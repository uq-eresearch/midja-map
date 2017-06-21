import favFilter from './filters/format-attribute-value.filter'
import propsFilter from './filters/props.filter'

export default angular.module('midjaApp.filters', [])
  .filter('formatAttributeValue', favFilter)
  .filter('props', propsFilter)
