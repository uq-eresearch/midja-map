'use strict';

describe('Service: labelService', function () {

    // load the service's module
    beforeEach(module('midjaApp'));

    // instantiate service
    var labelService;
    beforeEach(inject(function (_labelService_) {
        labelService = _labelService_;
    }));

    it('should do something', function () {
        expect(!!labelService).toBe(true);
    });


    it('should provide a getLabelFromCartoDbName function', function () {
        expect(typeof labelService.getLabelFromCartoDbName).toBe('function');
    });


    it('getLabelFromCartoDbName should return expectedValue', function() {
        var result = labelService.getLabelFromCartoDbName('iloc_pour_popcount_byindstatus_bysex');

        expect(result).toBe('iloc pour popcount byindstatus bysex');
    });


});
