'use strict';

/**
 * @ngdoc function
 * @name midjaApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the midjaApp
 */
angular.module('midjaApp')
  .controller('AboutCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
