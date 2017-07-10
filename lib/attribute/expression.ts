import R from 'ramda'
import { parse as mathjsParse } from 'mathjs'

type Scope = {[variable: string]: any}

interface Expression {
  evaluate: (scope: Scope) => any,
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
