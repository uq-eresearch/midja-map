import R from 'ramda'
import { parse as mathjsParse } from 'mathjs'

const extractVariables =
  R.pipe(
    R.filter(R.propEq('type', 'SymbolNode')),
    R.pluck('name'),
    R.uniq,
    R.sortBy(R.identity)
  )

export default function expression(textExpr) {
  const fNode = mathjsParse(textExpr)
  const code = fNode.compile()
  return {
    evaluate: scope => code.eval(scope),
    variables: extractVariables(fNode)
  }
}
