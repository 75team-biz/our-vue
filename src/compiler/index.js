/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'

/**
 * Compile a template.
 */
export function compile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  //将template字符串解析成ast
  // ast全称abstract syntax tree，是将template解析成一颗树状结构
  //这个树就是所谓的virtual dom
  const ast = parse(template.trim(), options)
  //优化
  optimize(ast, options)
  // 拼装render函数代码
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
}
