import dataService from './services/data.service'
import statsService from './services/stats.service'

export default angular.module('midjaApp.services', [])
  .factory('dataService', dataService)
  .factory('statsService', statsService)
