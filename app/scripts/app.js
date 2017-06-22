'use strict';

import angular from 'angular'
import 'angular-animate/angular-animate'
import 'angular-route/angular-route'
import 'angular-sanitize/angular-sanitize'
import accordion from 'angular-ui-bootstrap/src/accordion'
import modal from 'angular-ui-bootstrap/src/modal'
import tabs from 'angular-ui-bootstrap/src/tabs'
import 'ui-select'
import 'angular-loading-bar'
import 'angular-nvd3'

import dataTable from '../../node_modules/angular-data-table/release/dataTable.es6'
import '../../node_modules/angular-data-table/release/dataTable.css'
import '../../node_modules/angular-data-table/release/material.css'
import '../../node_modules/angular-data-table/release/icons.css'

import './directives'
import './filters'
import './services'

import '../styles/main.scss'
import '../views/main.html'

import MainController from './controllers/main.controller'
import LinearRegressionModalController from
  './controllers/linear-regression-modal.controller'
import RegionDetailsModalController from
  './controllers/region-details-modal.controller'
import ScatterPlotModalController from
  './controllers/scatter-plot-modal.controller'
import TopicDetailsModalController from
  './controllers/topic-details-modal.controller'
import TopicSelectionModalController from
  './controllers/topic-selection-modal.controller'

export default angular
  .module('midjaApp', [
    'ngAnimate',
    'ngRoute',
    'ngSanitize',
    accordion,
    modal,
    tabs,
    'ui.select',
    'angular-loading-bar',
    'nvd3',
    'data-table',
    'midjaApp.directives',
    'midjaApp.filters',
    'midjaApp.services'
  ])
  .controller('MainController', MainController)
  .controller(
    'LinearRegressionModalController',
    LinearRegressionModalController)
  .controller(
    'RegionDetailsModalController',
    RegionDetailsModalController)
  .controller(
    'ScatterPlotModalController',
    ScatterPlotModalController)
  .controller(
    'TopicDetailsModalController',
    TopicDetailsModalController)
  .controller(
    'TopicSelectionModalController',
    TopicSelectionModalController)
  .config(function($routeProvider, uiSelectConfig,
    $httpProvider, $locationProvider) {
    uiSelectConfig.resetSearchInput = true;
    $routeProvider
      .otherwise({
        template: require('../views/main.html'),
        controller: 'MainController',
        controllerAs: 'vm'
      });
  })
  .run(function($rootScope, $location) {
    $rootScope.$on('$locationChangeStart', function() {
      $location.path('/');
    });
  });
