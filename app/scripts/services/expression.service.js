import R from 'ramda'
import { parse as mathjsParse } from 'mathjs'

export default function expressionService($injector) {
  const extractVariables =
    R.pipe(
      R.filter(R.propEq('type', 'SymbolNode')),
      R.pluck('name'),
      R.uniq,
      R.sortBy(R.identity)
    )

  function parse(expr) {
    const fNode = mathjsParse(expr)
    const code = fNode.compile()
    return {
      evaluate: scope => code.eval(scope),
      variables: extractVariables(fNode)
    }
  }

  return R.objOf('parse', parse)
}
