'use strict';

describe('Controller: MainCtrl', function () {

    // load the controller's module
    beforeEach(angular.mock.module('midjaApp'));

    var MainCtrl,
        scope;

    // Initialize the controller and a mock scope
    beforeEach(inject(function ($controller, $rootScope) {
        scope = $rootScope.$new();
        MainCtrl = $controller('MainCtrl', {
            $scope: scope
        });
    }));

});
