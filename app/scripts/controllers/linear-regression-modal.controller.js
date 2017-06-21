export default function LinearRegressionModalController(
    $scope, $uibModalInstance, vm) {
  $scope.vm = vm;

  if (vm.linearRegression.sendData.modelType == "bar") {
    $scope.modalCfg = angular.copy(vm.barRegressionOptions);
  } else {
    $scope.modalCfg = angular.copy(vm.regressionOptions);
  }

  $scope.modalCfg["chart"]["width"] = 800;
  $scope.modalCfg["chart"]["height"] = 760;

  $scope.ok = function() {
    $uibModalInstance.close();
  };

  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
}
