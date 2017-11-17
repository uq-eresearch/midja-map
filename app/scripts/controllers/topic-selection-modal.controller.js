function splitWords(s) {
  return s.split(/"/).reduce((m, v, i) =>
    (i % 2 == 0) ?
    m.concat(v.split(/\s/)) :
    m.concat([v])
  , [])
}

function breakAtMatches(s, v) {
  const i = s.toLowerCase().indexOf(v.toLowerCase())
  if (!v || i == -1) {
    return [s]
  } else {
    return [s.slice(0, i), s.slice(i, i + v.length)]
      .concat(breakAtMatches(s.slice(i + v.length), v))
  }
}

function highlight(s, v) {
  return splitWords((v || "").toLowerCase())
    .reduce(
      (m, v) =>
        m.map(s => breakAtMatches(s, v)).reduce((a, b) => a.concat(b))
    , [s])
    .reduce(
      (m, part, i) =>
        m + (i % 2 == 0 ? part : `<b>${part}</b>`)
    , '')
}

function topicsFrom(topics, selectedTopics) {
  return topics.filter(
    (topic) => selectedTopics.some((selected) => selected.name == topic.name)
  )
}

export default function TopicSelectionModalController(
    $scope, $uibModalInstance, topics, currentlySelectedTopics) {
  $scope.topics = topics
  $scope.visibleTopics = topics
  $scope.selectedTopics = topicsFrom(
    $scope.visibleTopics, currentlySelectedTopics)
  $scope.tableOptions = {
    columnMode: 'flex',
    multiSelect: true,
    selectable: true,
    sortType: 'multiple',
    columns: [
      {
        name: "Topic",
        prop: 'description',
        flexGrow: 6,
        cellRenderer: (scope) => {
          const text = highlight(scope.$cell, scope.$row.highlightValue || '')
          return `<span title="${scope.$row.name}">${text}</span>`
        }
      },
      {
        name: "Category",
        prop: "category",
        flexGrow: 2,
        sort: 'asc',
        className: "capitalize"
      },
      {
        name: "Source",
        prop: 'source',
        flexGrow: 3,
        cellRenderer: (scope) => {
          const text = highlight(
            scope.$cell && scope.$cell.name || '',
            scope.$row.highlightValue || '')
          return `<span>${text}</span>`
        }
      }
    ]
  }
  $scope.$watch('search', function(searchValue) {
    $scope.visibleTopics = $scope.topics
      .filter((topic) => {
        const topicDesc = topic.description.toLowerCase()
        const sourceName =
          (topic.source && topic.source.name || '').toLowerCase()
        return !searchValue || splitWords(searchValue.toLowerCase()).every(
          v => [topicDesc, sourceName].some(t => t.indexOf(v) != -1)
        )
      })
      .map((topic) => {
        topic.highlightValue = searchValue
        return topic
      })
  })

  $scope.grouping = 'none'
  $scope.groupByOptions = ['none', 'category']
  $scope.groupBy = function(opt) {
    $scope.grouping = opt
    $scope.tableOptions.columns.forEach(column => { delete column.group })
    if (opt != 'none') {
      const col = $scope.tableOptions.columns.find(c => c.prop == opt)
      col.group = true
    }
  }

  $scope.initDataTable = function() {
    // Kludge to handle row placement error
    setTimeout(function() {
      const bodyEls = document.getElementsByClassName('dt-body');
      for (let i = 0; i < bodyEls.length; i++) {
        bodyEls.item(i).scrollTop = 1;
      }
    }, 100);
  };

  $scope.ok = function() {
    $uibModalInstance.close(topicsFrom($scope.topics, $scope.selectedTopics))
  }

  $scope.cancel = function() {
    $uibModalInstance.dismiss();
  }
}
