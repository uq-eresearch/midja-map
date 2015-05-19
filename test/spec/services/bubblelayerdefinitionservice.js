'use strict';

describe('Service: bubbleLayerDefinitionService', function () {

    // load the service's module
    beforeEach(module('midjaApp'));

    // instantiate service
    var bubbleLayerDefinitionService;
    beforeEach(inject(function (_bubbleLayerDefinitionService_) {
        bubbleLayerDefinitionService = _bubbleLayerDefinitionService_;
    }));

    it('should do something', function () {
        expect(!!bubbleLayerDefinitionService).toBe(true);
    });

    it('should provide a generateSql function', function () {
        expect(typeof bubbleLayerDefinitionService.generateSql).toBe('function');
    });


    it('generateSql should return expectedValue', function() {
        var result = bubbleLayerDefinitionService.generateSql({
            name: 'iloc_pour_popcount_byindstatus_bysex'
        }, {
            name: 'indigenoustotal_t_percent'
        });

        expect(result).toBe('SELECT iloc_2011_aust.iloc_code, ' +
        'ST_Transform(ST_Centroid(iloc_2011_aust.the_geom), 3857) as the_geom_webmercator, ' +
        'ST_Centroid(iloc_2011_aust.the_geom) as the_geom, ' +
        'iloc_pour_popcount_byindstatus_bysex.indigenoustotal_t_percent FROM iloc_pour_popcount_byindstatus_bysex, ' +
        'iloc_2011_aust WHERE iloc_2011_aust.iloc_code = iloc_pour_popcount_byindstatus_bysex.iloc_code');
    });



    it('should provide a generateCss function', function() {
        expect(typeof bubbleLayerDefinitionService.generateCss).toBe('function');
    });

    it('generateCss should return expectedValue', function() {
        var result = bubbleLayerDefinitionService.generateCss([
            1.21, 2.4, 3.63, 5.24, 8.2, 14.24, 28.42, 84.15, 92.02, 100
        ], {
            name: 'iloc_pour_popcount_byindstatus_bysex'
        }, {
            name: 'indigenoustotal_t_percent'
        });

        expect(result).toBe('#iloc_pour_popcount_byindstatus_bysex { ' +
        'marker-fill-opacity: 0.9; marker-line-color: #FFF; marker-line-width: 1.5; marker-line-opacity: 1; ' +
        'marker-placement: point; marker-multi-policy: largest; marker-type: ellipse; marker-fill: #3E7BB6; ' +
        'marker-allow-overlap: true; marker-clip: false; } ' +
        '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 100] { marker-width: 31; } ' +
        '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 92.02] { ' +
        'marker-width: 28.11111111111111; } ' +
        '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 84.15] { ' +
        'marker-width: 25.22222222222222; } ' +
        '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 28.42] { ' +
        'marker-width: 22.333333333333336; } ' +
        '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 14.24] { ' +
        'marker-width: 19.444444444444443; } ' +
        '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 8.2] { ' +
        'marker-width: 16.555555555555557; } ' +
        '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 5.24] { ' +
        'marker-width: 13.666666666666668; } ' +
        '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 3.63] { ' +
        'marker-width: 10.777777777777779; } ' +
        '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 2.4] { ' +
        'marker-width: 7.888888888888889; } ' +
        '#iloc_pour_popcount_byindstatus_bysex [indigenoustotal_t_percent <= 1.21] { marker-width: 5; }');
    });


});
