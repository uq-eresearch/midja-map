import downloadLink from './directives/download-link.directive'
import highlightedTopic from './directives/highlighted-topic.directive'
import linearRegressionControls from './directives/linear-regression-controls.directive'
import populationPyramid from './directives/population-pyramid.directive'
import regionMap from './directives/region-map.directive'
import timeSeriesChart from './directives/time-series-chart.directive'
import topicBreakdownBar from './directives/topic-breakdown-bar.directive'

export default angular.module('midjaApp.directives', [])
  .directive('downloadLink', downloadLink)
  .directive('highlightedTopic', highlightedTopic)
  .directive('linearRegressionControls', linearRegressionControls)
  .directive('populationPyramid', populationPyramid)
  .directive('regionMap', regionMap)
  .directive('timeSeriesChart', timeSeriesChart)
  .directive('topicBreakdownBar', topicBreakdownBar)
