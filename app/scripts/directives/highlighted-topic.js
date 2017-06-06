'use strict';

import _ from 'lodash-es'
import './styles/highlighted-topic.css'

/**
 * @ngdoc directive
 * @name midjaApp.directive:dataDownloadLink
 * @description
 */
angular.module('midjaApp')
  .directive('highlightedTopic', function(
    dataService, formattingService, $timeout) {

    function attributeMatcher(attributeSelector) {
      // TODO: Handle regex/function selectors
      return _.partial(_.find, _, _.matchesProperty('name', attributeSelector))
    }

    function populate(scope) {
      if (!scope.regionType || !scope.region) {
        return
      }
      return dataService.getAvailableAttributes(scope.regionType)
        .then(attributeMatcher(scope.attributeSelector))
        .then((attribute) => {
          return dataService.getAttributesForRegions(
              scope.regionType, [attribute.name], [scope.region])
              .then(_.flow(
                _.property(scope.region.code),
                _.property(attribute.name)))
              .then(v => $timeout(() => {
                scope.attribute = attribute
                scope.value = v
              }))
        })
    }

    function link(scope, element, attrs) {
      const populateHook = () => {
        return populate(scope)
      }
      scope.$watch('attributeSelector', populateHook)
      scope.$watch('region', populateHook)
      scope.$watch('regionType', populateHook)
      console.log(scope)
    }

    return {
      template: require('./templates/highlighted-topic.html'),
      restrict: 'E',
      link: link,
      replace: true,
      scope: {
        attributeSelector: '=',
        description: '@',
        region: '=',
        regionType: '='
      }
    };
  });
