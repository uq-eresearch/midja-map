export default function RegionDetailsModalController(
    $scope, $uibModalInstance, context) {
  $scope.context = context;

  // insert data
  $scope.ok = function() {
    $uibModalInstance.close();
  };

  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
}
