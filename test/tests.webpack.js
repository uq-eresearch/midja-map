import 'angular'
import 'angular-mocks/angular-mocks'
import '../app/scripts/app'

var testsContext = require.context('.', true)
testsContext.keys().forEach(testsContext);
