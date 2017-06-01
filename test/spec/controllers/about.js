'use strict';

require('../../../app/scripts/app.js');

describe('Controller: AboutCtrl', function () {

    // load the controller's module
    beforeEach(angular.mock.module('midjaApp'));

    var AboutCtrl,
        scope;

    // Initialize the controller and a mock scope
    beforeEach(inject(function ($controller, $rootScope) {
        scope = $rootScope.$new();
        AboutCtrl = $controller('AboutCtrl', {
            $scope: scope
        });
    }));

    //it('should attach a list of awesomeThings to the scope', function () {
    //  expect(scope.awesomeThings.length).toBe(3);
    //});
});
