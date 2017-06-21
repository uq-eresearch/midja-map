import dataService from './services/data.service'
import expressionService from './services/expression.service'
import formattingService from './services/formatting.service'
import statsService from './services/stats.service'

export default angular.module('midjaApp.services', [])
  .factory('dataService', dataService)
  .factory('expressionService', expressionService)
  .factory('formattingService', formattingService)
  .factory('statsService', statsService)
