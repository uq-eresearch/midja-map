import _ from 'lodash-es'

const sortByAttributeNameNumbers = (xs) => {
  const rows = _.map(
    xs,
    _.flow(
      _.property('name'),
      v => _.map(v.match(/\d+/g), _.toNumber)))
  const columns = _.unzip(rows)
  const iteratees = _.map(
    columns,
    _.flow( // Create (attribute -> column value) lookup
      _.partial(_.zipObject, _.map(xs, _.property('name'))), // Name map
      _.propertyOf, // Name-based lookup
      _.partial(_.flow, _.property('name')))) // Pre-apply name extraction
  return _.orderBy(xs, iteratees)
}

const sortByEducation = (xs) => {
  const sorter = v => _.findIndex([
    /none/,
    /certificate/,
    /diploma/,
    /bachelor/,
    /postgraduate/
  ], p => p.test(v))
  return _.sortBy(xs, _.flow(_.property('name'), sorter))
}

export { sortByAttributeNameNumbers, sortByEducation}
