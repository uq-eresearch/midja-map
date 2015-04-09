'use strict';

describe('Service: tableService', function () {

    // load the service's module
    beforeEach(module('midjaApp'));

    // instantiate service
    var tableService;
    beforeEach(inject(function (_tableService_) {
        tableService = _tableService_;
    }));

    it('should do something', function () {
        expect(!!tableService).toBe(true);
    });

    it('should provide a getTablePrefix function', function () {
        expect(typeof tableService.getTablePrefix).toBe('function');
    });

    it('getTablePrefix should return iloc for iloc_pour_popcount_byindstatus_bysex', function() {
        var result = tableService.getTablePrefix({
            name: 'iloc_pour_popcount_byindstatus_bysex'
        });
        expect(result).toBe('iloc');
    });

    it('getTablePrefix should return ste for ste_pour_popcount_byindstatus_bysex', function() {
        var result = tableService.getTablePrefix({
            name: 'ste_pour_popcount_byindstatus_bysex'
        });
        expect(result).toBe('ste');
    });

    it('should provide a getIdColumnForTable function', function () {
        expect(typeof tableService.getIdColumnForTable).toBe('function');
    });

    it('getIdColumnForTable should return iloc_code for iloc_pour_popcount_byindstatus_bysex', function() {
        var result = tableService.getIdColumnForTable({
            name: 'iloc_pour_popcount_byindstatus_bysex'
        });
        expect(result).toBe('iloc_code');
    });

    it('getIdColumnForTable should return state_code for ste_pour_popcount_byindstatus_bysex', function() {
        var result = tableService.getIdColumnForTable({
            name: 'ste_pour_popcount_byindstatus_bysex'
        });
        expect(result).toBe('state_code');
    });
});
