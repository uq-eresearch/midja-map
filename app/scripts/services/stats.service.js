export default function statsService($http) {
  var service = {};

  service.linearRegression = function statsService$linearRegression(data) {
    return $http.post('/stats/', data).then(function(response) {
      return response.data;
    });
  };

  return service;
}
