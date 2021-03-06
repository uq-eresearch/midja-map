import _ from 'lodash-es'
import createDataUri from 'create-data-uri'
const isPromise = (v) => { return Promise.resolve(v) == v }

export default function downloadLink() {
  function link(scope, element, attrs) {
    var clickHandler =
      _.flow(
        () => {
          return _.isFunction(scope.content) ? scope.content() : scope.content
        },
        (data) => { return isPromise(data) ? data : Promise.resolve(data) },
        (p) => {
          p.then(btoa).then((data) => {
            element.attr('href', createDataUri(scope.mimeType, data));
            element.off('click');
            element[0].click();
          })
          return false;
        })
    element.on('click', clickHandler);
  }

  return {
    template: require('./templates/download-link.html'),
    restrict: 'A',
    link: link,
    replace: true,
    transclude: true,
    scope: {
      content: '=',
      filename: '=',
      mimeType: '='
    }
  }
}
