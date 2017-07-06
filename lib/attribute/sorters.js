import R from 'ramda'

const sortByAttributeNameNumbers = (xs) => {
  // extractColumns :: [{name: String}] => [[Number]]
  const extractColumns =
    R.pipe(
      R.map( // Extract rows of integers (one row per attribute)
        R.pipe(
          R.prop('name'),
          v => R.map(parseInt, v.match(/\d+/g))
        ),
      ),
      R.transpose // Transpose to columns
    )
  // buildSorter :: [Number] → (Object → Number)
  const buildSorter =
    R.pipe( // Create (attribute -> column value) lookup
      R.zipObj(R.pluck('name', xs)), // Name map
      R.flip(R.prop), // (String → Number)
      R.partial( // Take attribute (not attr name) as input
        R.pipe,
        [ R.prop('name') ]
      ),
      R.ascend // Transform value extractor into comparator
    )
  const sorters = R.map(buildSorter, extractColumns(xs))
  return R.sortWith(sorters, xs)
}

const educationSorter = v => R.findIndex(p => p.test(v), [
  /none/,
  /certificate/,
  /diploma/,
  /bachelor/,
  /postgraduate/
])

const sortByEducation = R.sortBy(R.pipe(R.prop('name'), educationSorter))

export { sortByAttributeNameNumbers, sortByEducation}
