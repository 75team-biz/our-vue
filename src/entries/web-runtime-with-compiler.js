/* @flow */

import Vue from './web-runtime'
import { warn, cached } from 'core/util/index'
import { query } from 'web/util/index'
import { shouldDecodeNewlines } from 'web/util/compat'
import { compileToFunctions } from 'web/compiler/index'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

const mount = Vue.prototype.$mount    // 先保存原本的$mount实现，再装饰独有的功能
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && query(el)

  /* istanbul ignore if */
  // el 不能是body或html...
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  // resolve template/el and convert to render function
  // 使用者如果自己写了render函数，那就不走编译环节
    // 如果我们没有写 render 选项，那么就尝试将 template 或者 el 转化为 render 函数
  if (!options.render) {
    let template = options.template
    if (template) {
      // 提供了template属性
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          // template传值可以是id或字符串
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {// template传值可以是node
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {// 如果没有template，有el，则取el的outerHTML
      template = getOuterHTML(el)
    }
    if (template) {// 编译成render函数
      // compileToFunctions 是核心函数
      const { render, staticRenderFns } = compileToFunctions(template, {
        warn,
        shouldDecodeNewlines,
        delimiters: options.delimiters
      }, this)
      options.render = render   // 将赋值到options的render属性上
      options.staticRenderFns = staticRenderFns // staticRenderFns是为了优化，提取那些后期不用去更新的节点
    }
  }
  // 以上也就是在原本的$mount前加上了获取template和编译成render函数这两个功能
  // 调用原本的$mount实现
    // 调用已经缓存下来的 web-runtime.js 文件中的 $mount 方法
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
