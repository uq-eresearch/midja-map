import * as L from 'leaflet'
import angular from 'angular'
import 'angular-animate/angular-animate'
import 'angular-route/angular-route'
import 'angular-sanitize/angular-sanitize'
import accordion from 'angular-ui-bootstrap/src/accordion'
import modal from 'angular-ui-bootstrap/src/modal'
import 'ui-select'
import 'angular-loading-bar'
import 'angular-nvd3'

export default angular
  .module('midjaApp', [
    'ngAnimate',
    'ngRoute',
    'ngSanitize',
    accordion,
    modal,
    'ui.select',
    'angular-loading-bar',
    'nvd3'
  ])
  .constant('L', L)
