export default function TopicDetailsModalController(
    $scope, $uibModalInstance, topic) {
  $scope.topic = topic;

  $scope.ok = function() {
    $uibModalInstance.close();
  };

  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
}
