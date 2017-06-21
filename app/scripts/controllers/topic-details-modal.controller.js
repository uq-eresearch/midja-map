export default function TopicDetailsModalController(
    $scope, $uibModalInstance, topic) {
  $scope.topic = topic;

  $scope.ok = function(result) {
    $uibModalInstance.close(result);
  };

  $scope.cancel = function(reason) {
    $uibModalInstance.dismiss(reason);
  };
}
