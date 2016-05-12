'use strict';

/**
 * @ngdoc function
 * @name midjaApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the midjaApp
 */
angular.module('midjaApp')
    .controller('MainCtrl', function (auth, datasetService, layerService, dataService, labelService, $http, $scope, $uibModal, $timeout, $window) {
	var vm = this;
	vm.propTopicsOnly = false;
	vm.scatterOptions = {
		chart: {
			type: 'scatterChart',
			height: 450,
			width: 350,
			showLegend: false,
			color: d3.scale.category10().range(),
			scatter: {
				onlyCircles: true
			},
			legend: {
				updateState: false
			},
			duration: 350,
			margin: {right: 60}, // a bit hacky
			dispatch: {
				renderEnd: function(e) {
					if (vm.scatterPlot.labelLocations) {
						vm.showLabel("#scatterGraph", vm.scatterPlot.second);
					}
				}
			},				
			useInteractiveGuideline: false,
			interactive: true,
			tooltip: {
				position: {"top": 200},
				contentGenerator: function (d) { //return html content
					var html = "<h3>"+d.point.name+"</h3>";
					html += "<p>x: " + d.point.x + ", y: " + d.point.y + "</p>"
					return html;
				}
			},
			zoom: {
				enabled: false
			}
		}
	};
		
	vm.regressionOptions = {
		chart: {
			type: 'scatterChart',
			height: 450,
			width: 350,
			showLegend: false,
			color: d3.scale.category10().range(),
			scatter: {
				onlyCircles: true
			},
			legend: {
				updateState: false
			},					
			duration: 350,
			margin: {right: 60}, // a bit hacky					
			useInteractiveGuideline: false,
			interactive: true,
			tooltip: {
				position: {"top": 200},
				contentGenerator: function (d) { //return html content
				  var html = "<h3>"+d.point.name+"</h3>";
				  html += "<p>x: " + d.point.x + ", y: " + d.point.y + "</p>"
				  return html;
				}
			},
			zoom: {
				enabled: false
			}
		}
	};	

	vm.barRegressionOptions = {
		chart: {
			type: 'discreteBarChart',
			height: 450,
			margin : {
				right: 60
			},
			width: 350,
			x: function(d){return d.label;},
			y: function(d){return d.value + (1e-10);},
			showValues: true,
			valueFormat: function(d){
				return d3.format(',.3f')(d);
			},
			legend: {
				updateState: false
			},						
			duration: 500,
			forceY: [0,1],
			yAxis: {
				axisLabel: 'Adjusted R-square',
				axisLabelDistance: -10
			},
			xAxis: {
				tickPadding: 10
			}						
		}
	};			
	//TODO: Explain
	vm.curRemoteness = [];
	vm.iRemoteness = {};

	vm.categories = [];
	
	vm.vis = {
		remotenessLevel: 'all',
		lgaBlock: '565',
		unitSel: "ILOCs",
		locations: [],
		units: [],
		categories: [],
		topics: [],
		bubble: {
			topic: null
		},
		choropleth: {
			topic: null
		}
	};
	vm.linearRegression = {
		filename: null,
		dependent: null,
		independents: []
	}
	vm.locations = [];
	vm.columns = [];

	vm.columnsFromMetadata = [];
	vm.columnsFromMetadataPropCols = [];

	vm.visStatus = {
		choroplethVisible: true,
		bubbleVisible: false
	};

	vm.scatterPlot = {
		filename: null,
		xaxis: null,
		yaxis: null,
		useRemoteness: false,
		labelLocations: false
	};

	vm.selectedLocationsChanged = selectedPlacesChanged;
	vm.selectedTopicsChanged = selectedTopicsChanged;
	vm.selectedCategoryChanged = selectedCategoryChanged;
	vm.selectedBubbleTopicChanged = selectedBubbleTopicChanged;
	vm.selectedRegionTopicChanged = selectedRegionTopicChanged;
	vm.selectedDependentChanged = selectedDependentChanged;
	vm.selectedIndependentsChanged = selectedIndependentsChanged;
	vm.isDataSelected = isDataSelected;

	vm.selectedTable = 'iloc_merged_dataset'; // TODO: tie to a GUI option, do change handler
	vm.tablePrefix = 'iloc';
	vm.unitSels = ['LGAs', 'ILOCs'];
	vm.lgaBlocks = [{value: "565",
					 description: "All LGAs"},
					{value: "73",
					description: "Affordability > 4, residents <= 4"},
					{value: "183",
					 description: "Affordability > 3.33, residents <= 6"}, 
					{value: "99",
					 description: "Affordability > 3.33, population > 150"},
					{value: "156",
					 description: "Affordability > 3, population > 150, aged 16-60 > 33%"}];
	activate(vm.selectedTable);

	vm.refreshLocations = refreshLocations;

	vm.showPropTopicsOnly = showPropTopicsOnly;

	vm.selectedScatterXChanged = selectedScatterXChanged;
	vm.selectedScatterYChanged = selectedScatterYChanged;
	vm.generateScatterPlot = generateScatterPlot;
	
	vm.requestScatterDownload = requestScatterDownload;
	vm.requestLinearRegressionDownload = requestLinearRegressionDownload;

	vm.clearLabels = clearLabels;
	
	vm.showLabel = showLabel;
	
	vm.placeDetails = null;
	
	function clearLabels(){
		d3.selectAll(".label").remove();
	}		
		
	function showLabel(id, id2){ // make general
		vm.clearLabels();
		d3.select(id).selectAll(".nv-group path")[0].forEach(function(d){
			  var tf = d3.select(d).attr("transform");
			  var t = d3.transform(tf).translate;
			  t[0] = t[0] + 6;
			  t[1] = t[1] + 3;
			  d3.select(d.parentNode)
				.append("text")
				.attr("class", "label")
				.attr("style", "font: normal 10px Arial")
				.text(d3.select(d).data()[0][0].name)
				.attr("transform", "translate("+t[0]+","+t[1]+")");
				
		});
		if (typeof id2 !== 'undefined') {
			d3.select(id2).selectAll(".nv-group path")[0].forEach(function(d){
				  var tf = d3.select(d).attr("transform");
				  var t = d3.transform(tf).translate;
				  t[0] = t[0] + 6;
				  t[1] = t[1] + 3;
				  d3.select(d.parentNode)
					.append("text")
					.attr("class", "label")
					.attr("style", "font: normal 10px Arial")
					.text(d3.select(d).data()[0][0].name)
					.attr("transform", "translate("+t[0]+","+t[1]+")");
					
			});
		}
	}
	
    vm.map = null;
    vm.dataColumnVisible = true;
    vm.toggleDataColumn = function() {
		$('#dataColumn').fadeToggle("fast");
        $('#mapColumn').toggleClass('col-md-6', 'col-md-9');
        vm.dataColumnVisible = !vm.dataColumnVisible;

        vm.map.invalidateSize(true);
		
		if(vm.dataColumnVisible && vm.chartobj.chart) {
			$timeout(function() {
				vm.chartobj.redraw();
			}, 100);
		}
    };

	// google chart does not refresh on window resize
	angular.element($window).bind('resize', function() {
		if(vm.chartobj.chart) {
			vm.chartobj.redraw();
		}
	});


	// select a place
	// load ilocs for selected places
	// load the ilocs
	// generate visualisations
	// TODO: Generalise comment

	//
	
	
	function activate(table) {
		if (table == 'iloc_merged_dataset') {
			var sql = 'SELECT DISTINCT ra_name FROM ' + table + ';';
			dataService.doQuery(sql).then(function (result) {
				vm.remotenessLevels = result.rows;
			});		
		}

		$http.get('http://midja.org:3232/datasets/' + table + '?expanded').then(function(response) {
			vm.columnsFromMetadata = _.reject(response.data.attributes, function(column) {
				return column.data_type !== 'number';
			});
			vm.columns = vm.columnsFromMetadata;

			var regex = /proportion|percentage/i;
			vm.columnsFromMetadataPropCols = _.filter(vm.columnsFromMetadata, function(column) {
				return regex.test(column.short_desc);
			});
		});

		$http.get('http://midja.org:3232/categories/all').then(function(response) {
			vm.categories = response.data;
		});		
	}

	function isDataSelected() {
		return vm.vis.topics.length && vm.vis.locations.length;
	}


	function getColumns(dataset) {
		return datasetService.getColumns(dataset);
	}

	/**
	 * The user changed the places they selected
	 */
	function selectedPlacesChanged() {
		// angular sets vm.vis.locations[1] to undefined when the
		// corresponding ui-select is cleared
		if(vm.vis.locations.length == 2 && !vm.vis.locations[1]) {
			vm.vis.locations.pop();
		}
		
		vm.vis.topics = [];
		vm.regionLayer = layerService.build('polygon');
		vm.bubbleLayer = layerService.build('bubble');
		
		if (vm.vis.unitSel == 'ILOCs') {
			vm.tablePrefix = "iloc";
			vm.selectedTable = "iloc_merged_dataset";
			activate("iloc_merged_dataset")		
		} else {
			if (vm.vis.lgaBlock == '565') {
				vm.tablePrefix = "lga";
				vm.selectedTable = "lga_merged_dataset";
				activate("lga_merged_dataset")
			} else if (vm.vis.lgaBlock == 'ILOCs') {
				vm.tablePrefix = "iloc";
				vm.selectedTable = "iloc_merged_dataset";
				activate("iloc_merged_dataset")
			} else  if (vm.vis.lgaBlock == '73'){
				vm.tablePrefix = "lga";
				vm.selectedTable = "lga_merged_dataset";
				activate("lga_merged_dataset_preexp")
			} else if (vm.vis.lgaBlock == '183'){
				vm.tablePrefix = "lga";
				vm.selectedTable = "lga_merged_dataset";
				activate("composite_measure_183_lgas")
			} else if (vm.vis.lgaBlock == '99'){
				vm.tablePrefix = "lga";
				vm.selectedTable = "lga_merged_dataset";
				activate("final_99_lgas")
			} else if (vm.vis.lgaBlock == '156'){
				vm.tablePrefix = "lga";
				vm.selectedTable = "lga_merged_dataset";
				activate("new_156_lgas")
			}
		}
		
		
		var places = getSelectedPlaceExcludingAustralia();
		
		
		
		if (vm.tablePrefix == "iloc") {
			dataService.getIlocsInPlaces(places, vm.vis.remotenessLevel).then(function (results) {
				var units = results.rows;
				if (!units.length) {
					// revert back the removenessLevel in the UI when no ILOCs are found
					vm.vis.remotenessLevel = vm.vis.currRemotenessLevel;
					window.alert('No ILOCs found.');
				} else {
					vm.vis.currRemotenessLevel = vm.vis.remotenessLevel;
					vm.vis.units = units;
					generateVisualisations();
					generateScatterPlot();
					generateLinearRegression();
				}
			});		
		} else { //TODO: this is lga but don't necessarily know that
			dataService.getLgasInPlaces(places, vm.vis.lgaBlock).then(function (results) {
				var units = results.rows;
				if (!units.length) {
					window.alert('No LGAs found.');
				} else {
					vm.vis.units = units;
					generateVisualisations();
					generateScatterPlot();
					generateLinearRegression();
				}
			});
		}
	}

	/**
	 * Get the places the user has selected
	 *
	 * Filter out australia, because its just EVERYTHING, so we don't
	 * really need it.
	 *
	 * @returns {*} List of places selected
	 */
	function getSelectedPlaceExcludingAustralia() {
		var places = _.reject(vm.vis.locations, function (location) {
			return location.type === 'country';
		});
		return places;
	}

	function generateVisualisations() {
		if (!vm.vis.units.length) {
			vm.chartData = [];
			vm.tableData = [];
			return;
		}
		if (vm.vis.topics.length) {
			generateBarChart();
		}
		if (vm.vis.bubble.topic) {
			generateBubbleLayer(vm.vis.bubble.topic, vm.vis.units);
		}
		if (vm.vis.choropleth.topic) {
			generateChoroplethLayer(vm.vis.choropleth.topic, vm.vis.units);
		}

	}

	function selectedTopicsChanged($item, $model) {
		generateBarChart();
		if (vm.vis.topics.length === 1) {
			var topic = vm.vis.topics[0];
			// set the default for the map
			vm.vis.bubble.topic = topic;
			vm.vis.choropleth.topic = topic;

			generateBubbleLayer(vm.vis.bubble.topic, vm.vis.units);
			generateChoroplethLayer(vm.vis.choropleth.topic, vm.vis.units);
		}
	}
	
	function selectedCategoryChanged($item, $model) {
		if (vm.vis.category.length < 1) {
			showPropTopicsOnly(vm.propTopicsOnly);
		} else {
			if (vm.propTopicsOnly) {
				vm.columns = _.filter(vm.columnsFromMetadataPropCols, function(item) {
					return _.contains(_.pluck(vm.vis.category, 'cat_id'), item.cat_id); 
				});
			} else {
				vm.columns = _.filter(vm.columnsFromMetadata, function(item) {
					return _.contains(_.pluck(vm.vis.category, 'cat_id'), item.cat_id); 
				});
			}
		}
	}
	
	// TODO: deal with remoteness
	function generateBarChart() {
		var topicsList = _.pluck(vm.vis.topics, 'name').join(',');
		var unitCodes = _.pluck(vm.vis.units, vm.tablePrefix + '_code');
		
		var sql;
		if (vm.tablePrefix == "iloc") {
			sql = 'SELECT ' + topicsList + ', ra_name, ' + vm.tablePrefix + '_name FROM ' + vm.selectedTable
				+ ' WHERE ' + vm.tablePrefix + '_code IN (\'' + unitCodes.join('\' ,\'') + '\') order by ' + vm.tablePrefix + '_name;';
		
		} else { //TODO LGA
			sql = 'SELECT ' + topicsList + ', ' + vm.tablePrefix + '_name FROM ' + vm.selectedTable
				+ ' WHERE ' + vm.tablePrefix + '_code IN (\'' + unitCodes.join('\' ,\'') + '\') order by ' + vm.tablePrefix + '_name;';
		}
		dataService.doQuery(sql).then(function (results) {
			if (!results.rows.length) {
				return;
			}
			if (vm.tablePrefix == "iloc") {
				vm.curRemoteness = _.pluck(results.rows, 'ra_name');
			
			}
			// get the columns
			var topics = _.keys(results.rows[0]);

			// build table header
			var header = ['Topic'].concat(_.pluck(results.rows, vm.tablePrefix + '_name'));

			// build table
			vm.tableData = [header];
			vm.chartData = vm.tableData.slice();
			_.forEach(vm.vis.topics, function(topic) {
				var dataRow = _.pluck(results.rows, topic.name);
                var dataRowText = dataRow.map(function(d) {
                    return d.toFixed(2);
                });

                vm.tableData.push([topic.short_desc+' ('+topic.name+')'].concat(dataRowText));				
				vm.chartData.push([topic.name].concat(dataRow));
			});
		});
	}


	function selectedBubbleTopicChanged($item, $model) {
		generateBubbleLayer($item, vm.vis.units);
	}

	function selectedRegionTopicChanged($item, $model) {
		generateChoroplethLayer($item, vm.vis.units);
	}


	function generateBubbleLayer(topic, locations) {
		var bubbleLayerService = layerService.build('bubble');
		bubbleLayerService.build({
			name: vm.selectedTable
		}, topic, locations).then(function (layerDefinition) {
			vm.bubbleLayer = layerDefinition;
		});
	}

	function generateChoroplethLayer(topic, locations) {
		var bubbleLayerService = layerService.build('polygon');
		bubbleLayerService.build({
			name: vm.selectedTable
		}, topic, locations).then(function (layerDefinition) {
			vm.regionLayer = layerDefinition;
		});
	}


	function refreshLocations(name) {
		if (!name || !name.length) {
			vm.locations = [];
			return;
		}
		
		if (vm.tablePrefix == "iloc") {
			dataService.getIlocLocationsStartingWith(name).then(function (locations) {
				locations.unshift({
					name: 'Australia',
					type: 'country'
				})
				vm.locations = locations;
			});		
		} else { // check for lga
			dataService.getLgaLocationsStartingWith(name, vm.vis.lgaBlock).then(function (locations) {
				locations.unshift({
					name: 'Australia',
					type: 'country'
				})
				vm.locations = locations;
			});		
		}

	}


	function selectedDependentChanged($item, $model) {
		generateLinearRegression();
	}

	function selectedIndependentsChanged($item, $model) {
		generateLinearRegression();
	}

	//TODO fix remoteness levels
	function generateLinearRegression() {
		if (!vm.linearRegression.dependent || !vm.linearRegression.independents.length) {
			return;
		}
		var resultsData = [];
		var data = {
			"dataset": vm.selectedTable,
			"depVar": vm.linearRegression.dependent.name,
			"depLabel": vm.linearRegression.dependent.short_desc,
			"indepVars": _.pluck(vm.linearRegression.independents, 'name'),
			"indepVarLabels": _.pluck(vm.linearRegression.independents, 'short_desc'),
			"unit_prefix": vm.tablePrefix,
			"unit_codes": _.pluck(vm.vis.units, vm.tablePrefix + '_code'),
			"unit_type": vm.tablePrefix
		};

		$http.post('http://midja.org:4000', data).then(function (response) {
			var iDep = -1;
			var iInds = Array.apply(null, Array(data.indepVars.length)).map(Number.prototype.valueOf,0);
			var indVarLabels = _.pluck(vm.linearRegression.independents, 'short_desc');
			if (data.indepVars.length > 1) {
				vm.barRegressionOptions["chart"]["yAxis"]["axisLabel"] = "Adjusted R-square";	
				resultsData.push({
					key: "Data",
					values: [
						{
							"label" : data.depLabel ,
							"value" : response.data.adj_rsquared
						}
					]
				});
				vm.linearRegression.resultsData = resultsData;
				vm.linearRegression.results = response.data;
				data.raw = vm.linearRegression.resultsData;
				data.modelType = "bar";
				vm.linearRegression.sendData = data;					
				return
			}
			vm.regressionOptions["chart"]["xAxis"] = {"axisLabel": indVarLabels[0]}; // TODO: fix
			vm.regressionOptions["chart"]["yAxis"] = {"axisLabel": vm.linearRegression.dependent.short_desc};	
			
			if (vm.tablePrefix == "iloc") {
				for (var i = 0; i < vm.remotenessLevels.length; i++) {
					resultsData.push({
						key: vm.remotenessLevels[i].ra_name,
						values: []
					});
					vm.iRemoteness[vm.remotenessLevels[i].ra_name] = i;
				}			
			} else {
				resultsData.push({
					key: "Data",
					values: []
				});				
			}
			
			for (var k = 1; k < vm.tableData.length; k++) {
				if (vm.tableData[k][0] == vm.linearRegression.dependent.short_desc + " (" + data.depVar + ")") {
					iDep = k;
				}
				for (var v = 0; v < indVarLabels.length; v++) {
					if (vm.tableData[k][0] == indVarLabels[v] + " (" + data.indepVars[v] + ")") {
						iInds[v] = k;
					}			
				}
			}
			
			for (var i = 1; i < vm.tableData[0].length - 1; i++) { // vm.tableData[0].length - 1
				resultsData[0].values.push({ //put into first one
					x: parseFloat(vm.tableData[iInds[0]][i]), //TODO: FIX
					y: parseFloat(vm.tableData[iDep][i]),
					name: vm.tableData[0][i]
				});
			}

			
			var equationParts = response.data.equation.split(" ");
		
			resultsData.push({
					key: "Line",
					values: [],
					intercept: equationParts[2],
					slope: equationParts[4]
				});
			
			vm.linearRegression.resultsData = resultsData;
			vm.linearRegression.results = response.data;
			data.raw = vm.linearRegression.resultsData;
			vm.linearRegression.sendData = data;				
		});

	}


	function showPropTopicsOnly(isChecked) {
		
		if (vm.vis.category.length < 1) {
			if(isChecked) {
				vm.columns = vm.columnsFromMetadataPropCols;
			} else {
				vm.columns = vm.columnsFromMetadata;
			}
		} else {
			if (vm.propTopicsOnly) {
				vm.columns = _.filter(vm.columnsFromMetadataPropCols, function(item) {
					return _.contains(_.pluck(vm.vis.category, 'cat_id'), item.cat_id); 
				});
			} else {
				vm.columns = _.filter(vm.columnsFromMetadata, function(item) {
					return _.contains(_.pluck(vm.vis.category, 'cat_id'), item.cat_id); 
				});			
			}		
		}
	}


	function selectedScatterXChanged() {
		generateScatterPlot();
	}

	function selectedScatterYChanged() {
		generateScatterPlot();
	}

	//TODO: fix remoteness stuff for LGAs
	function generateScatterPlot() {
		if(!vm.scatterPlot.xaxis || !vm.scatterPlot.yaxis) {
			return;
		}
		if (vm.scatterPlot.labelLocations) {
			vm.showLabel("#scatterGraph", vm.scatterPlot.second);
		} else {
			vm.clearLabels();
		}
		vm.scatterPlot.filename = null;
		var data = {
			"dataset": vm.selectedTable,
			"xvar": vm.scatterPlot.xaxis.name,
			"xlabel": vm.scatterPlot.xaxis.short_desc,
			"yvar": vm.scatterPlot.yaxis.name,
			"ylabel": vm.scatterPlot.yaxis.short_desc,
			"useRemoteness": vm.scatterPlot.useRemoteness,
			"labelLocations": vm.scatterPlot.labelLocations,
			"unit_codes": _.pluck(vm.vis.units, vm.tablePrefix + '_code')
		};
		
		var resultsData = []
		var ix = -1;
		var iy = -1;
		
		if (vm.tablePrefix == "iloc") {
			for (var i = 0; i < vm.remotenessLevels.length; i++) {
				resultsData.push({
					key: vm.remotenessLevels[i].ra_name,
					values: []
				});
				vm.iRemoteness[vm.remotenessLevels[i].ra_name] = i;
			}
		} else { // lga
			resultsData.push({
					key: "Data",
					values: []
				});		
		}
		
		for (var k = 1; k < vm.tableData.length; k++) {
			if (vm.tableData[k][0] == data.xlabel + " (" + data.xvar + ")") {
				ix = k;
			}
			if (vm.tableData[k][0] == data.ylabel + " (" + data.yvar + ")") {
				iy = k;
			}
		}

		if (vm.scatterPlot.useRemoteness) {
			for (var i = 1; i < vm.tableData[0].length - 1; i++) { // vm.tableData[0].length - 1
				resultsData[vm.iRemoteness[vm.curRemoteness[i-1]]].values.push({
					x: parseFloat(vm.tableData[ix][i]),
					y: parseFloat(vm.tableData[iy][i]),
					name: vm.tableData[0][i]
				});
			}
		} else {
			for (var i = 1; i < vm.tableData[0].length - 1; i++) { // vm.tableData[0].length - 1
				resultsData[0].values.push({
					x: parseFloat(vm.tableData[ix][i]),
					y: parseFloat(vm.tableData[iy][i]),
					text: "fooLabelsOfScatterPoints",
					name: vm.tableData[0][i]
				});
			}
		}
		
		vm.scatterOptions["chart"]["showLegend"] = vm.scatterPlot.useRemoteness;
		
		if (vm.scatterPlot.second != null) {
			vm.scatterPlot.secondOptions["chart"]["showLegend"] = vm.scatterPlot.useRemoteness;
		}
		
		vm.scatterPlot.results = resultsData;
		
		data.raw = resultsData;
		vm.scatterPlot.sendData = data;
		
		vm.scatterOptions["chart"]["xAxis"] = {"axisLabel": data.xlabel};
		vm.scatterOptions["chart"]["yAxis"] = {"axisLabel": data.ylabel};
		
	}
	
	function requestScatterDownload(fileType) {
		vm.scatterPlot.filename = null;
		vm.scatterPlot.sendData.fileType = fileType
		$http.post('http://midja.org:3333/receive', vm.scatterPlot.sendData).then(function(response) {
			vm.scatterPlot.filename = response.data;
			var newWindow = window.open('')
			newWindow.location = "http://www.midja.org:3333/"+response.data;
		});		
	}
	
	function requestLinearRegressionDownload(fileType) {
		vm.linearRegression.filename = null;
		vm.linearRegression.sendData.fileType = fileType
		$http.post('http://midja.org:3333/receive', vm.linearRegression.sendData).then(function(response) {
			vm.linearRegression.filename = response.data;
			var newWindow = window.open('')
			newWindow.location = "http://www.midja.org:3333/"+response.data;			
		});		
	}
	
	$scope.openScatterModal = function () {

		var modalInstance = $uibModal.open({
		  animation: true,
		  size: 'lg',
		  templateUrl: 'scatter.html',
		  controller: 'ModalInstanceCtrl',
		  resolve: {
			vm: function () {
				return vm;
			}
		  }
		});

		modalInstance.result.then(function () {
		}, function () {
		
		});
	};

	$scope.openRegModal = function () {
		var modalInstance = $uibModal.open({
		  animation: true,
		  size: 'lg',
		  templateUrl: 'regression.html',
		  controller: 'RegModalInstanceCtrl',
		  resolve: {
			vm: function () {
				return vm;
			}
		  }
		});

		//TODO: try without
		modalInstance.result.then(function () {
		}, function () {
		
		});
	};
	
});	
	
angular.module('midjaApp').controller('ModalInstanceCtrl', function ($scope, $uibModalInstance, vm) {
	$scope.vm = vm;
	
	vm.scatterPlot.second = "#scatterGraphModal";
	$scope.modalCfg = angular.copy(vm.scatterOptions);
	$scope.modalCfg["chart"]["width"] = 800;
	$scope.modalCfg["chart"]["height"] = 760;
	vm.scatterPlot.secondOptions = $scope.modalCfg;

	$scope.ok = function () {
		vm.scatterPlot.second = null;
		vm.scatterPlot.secondOptions = null;
		$uibModalInstance.close();
	};
});	

angular.module('midjaApp').controller('RegModalInstanceCtrl', function ($scope, $uibModalInstance, vm) {
	$scope.vm = vm;
	
	if (vm.linearRegression.sendData.modelType == "bar") {
		$scope.modalCfg = angular.copy(vm.barRegressionOptions);
	} else {
		$scope.modalCfg = angular.copy(vm.regressionOptions);
	}

	$scope.modalCfg["chart"]["width"] = 800;
	$scope.modalCfg["chart"]["height"] = 760;

	$scope.ok = function () {
		$uibModalInstance.close();
	};

	$scope.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});

angular.module('midjaApp')
    .controller( 'LoginCtrl', function ( $scope, auth) {

  $scope.auth = auth;
  $scope.auth.signin();

});

angular.module('midjaApp').controller('DetailsModalInstanceCtrl', function ($scope, $uibModalInstance, vm, stats) {
	$scope.vm = vm;
	// insert data
	$scope.ok = function () {
		$uibModalInstance.close();
		$scope.vm.placeDetails = null;
	};

	$scope.cancel = function () {
		$uibModalInstance.dismiss('cancel');
		$scope.vm.placeDetails = null;
	};
	$scope.vm.placeDetails = stats.rows[0];
});		