/* @flow */

import { extend, genStaticKeys, noop } from 'shared/util'
import { warn } from 'core/util/debug'
import { compile as baseCompile } from 'compiler/index'
import { detectErrors } from 'compiler/error-detector'
import modules from './modules/index'
import directives from './directives/index'
import { isReservedTag, mustUseProp, getTagNamespace, isPreTag } from '../util/index'
import { isUnaryTag } from './util'

const cache: { [key: string]: CompiledFunctionResult } = Object.create(null)

// 这是web平台特性下需要给compile添加的options
export const baseOptions: CompilerOptions = {
  expectHTML: true,
  modules,// web平台才有的module， 这个用于virtual dom
  staticKeys: genStaticKeys(modules),
  directives, // web平台才有的指令
  isReservedTag, // 保留节点
  isUnaryTag, // 自闭和节点
  mustUseProp,// 必须用固有属性来做绑定
  getTagNamespace,// tag的命名空间
  isPreTag
}

export function compile (
  template: string,
  options?: CompilerOptions
): CompiledResult {
  options = options
    ? extend(extend({}, baseOptions), options) // merge传入的option的baseOptions
    : baseOptions
  return baseCompile(template, options) //baseCompile 才是真正的compile函数，在compile目录中
}

export function compileToFunctions (
  template: string,
  options?: CompilerOptions,
  vm?: Component
): CompiledFunctionResult {
  const _warn = (options && options.warn) || warn
  // detect possible CSP restriction
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production') {
    try {
      new Function('return 1')
    } catch (e) {
      if (e.toString().match(/unsafe-eval|CSP/)) {
        _warn(
          'It seems you are using the standalone build of Vue.js in an ' +
          'environment with Content Security Policy that prohibits unsafe-eval. ' +
          'The template compiler cannot work in this environment. Consider ' +
          'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
          'templates into render functions.'
        )
      }
    }
  }
  //...
  // 有缓存的话就直接在缓存里面拿
  const key = options && options.delimiters
    ? String(options.delimiters) + template
    : template
  if (cache[key]) {
    return cache[key]
  }
  const res = {}
  // compile里面有1,2,3,4步重要操作
  const compiled = compile(template, options)
  //通过new Function的方式生成render函数并缓存
  res.render = makeFunction(compiled.render)
  const l = compiled.staticRenderFns.length
  res.staticRenderFns = new Array(l)
  for (let i = 0; i < l; i++) {
    res.staticRenderFns[i] = makeFunction(compiled.staticRenderFns[i])
  }
  if (process.env.NODE_ENV !== 'production') {
    if (res.render === noop || res.staticRenderFns.some(fn => fn === noop)) {
      _warn(
        `failed to compile template:\n\n${template}\n\n` +
        detectErrors(compiled.ast).join('\n') +
        '\n\n',
        vm
      )
    }
  }
  return (cache[key] = res)
}

function makeFunction (code) {
  try {
    return new Function(code)
  } catch (e) {
    return noop
  }
}
