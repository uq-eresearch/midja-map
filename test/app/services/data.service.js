'use strict';

import { expect } from 'chai'

describe('Service: dataService', function () {

    // load the service's module
    beforeEach(angular.mock.module('midjaApp.services'));

    // instantiate service
    var dataService;
    beforeEach(inject(function (_dataService_) {
        dataService = _dataService_;
    }));

    it('should do something', function () {
        expect(!!dataService).to.be.true;
    });


});
