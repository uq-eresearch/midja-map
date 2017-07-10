import R from 'ramda'
import { parse as mathjsParse } from 'mathjs'

interface Expression {
  evaluate: (scope: object) => any,
  variables: string[]
};

const extractNodeNames: (nodes: mathjs.MathNode[]) => string[] =
  R.pluck('name')

const extractVariables: (fNode: mathjs.MathNode) => string[] =
  R.pipe(
    (n: mathjs.MathNode) => n.filter(R.propEq('type', 'SymbolNode')),
    extractNodeNames,
    R.uniq,
    R.sortBy(R.identity)
  )

export default function expression(textExpr: string): Expression {
  const fNode = mathjsParse(textExpr)
  const code = fNode.compile()
  return {
    evaluate: scope => code.eval(scope),
    variables: extractVariables(fNode)
  }
}
