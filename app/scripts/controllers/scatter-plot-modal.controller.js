export default function ScatterPlotModalController(
    $scope, $uibModalInstance, vm) {
  $scope.vm = vm;

  vm.scatterPlot.second = "#scatterGraphModal";
  $scope.modalCfg = angular.copy(vm.scatterOptions);
  $scope.modalCfg["chart"]["width"] = 800;
  $scope.modalCfg["chart"]["height"] = 760;
  vm.scatterPlot.secondOptions = $scope.modalCfg;

  $scope.ok = function() {
    vm.scatterPlot.second = null;
    vm.scatterPlot.secondOptions = null;
    $uibModalInstance.close();
  };
}
