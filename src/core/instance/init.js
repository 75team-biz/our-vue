/* @flow */

import { initProxy } from './proxy'
import { initState } from './state' //数据绑定的核心方法，包括常用的$watch方法
import { initRender } from './render' //渲染的核心方法，用来生成render函数以及VNode
import { initEvents } from './events' //事件的核心方法，包括常用的$on，$off，$emit方法
import { initLifecycle, callHook } from './lifecycle' //生命周期的核心方法
import { mergeOptions } from '../util/index'

let uid = 0

//initMixin 初始化的入口，各种初始化工作
export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++
    // a flag to avoid this being observed //避免 vm 被监控
    vm._isVue = true
    // merge options 处理参数
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    //走到这一步，会把业务逻辑以及组件的一些特性全都放到了vm.$options中了，
    //后续的操作我们都可以从vm.$options拿到可用的信息。
    //框架基本上都是对输入宽松，对输出严格，
    //vue也是如此，不管使用者添加了什么代码，最后都规范的收入vm.$options中。

    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)  //初始化 proxy
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm)   //vm的生命周期相关变量初始化
    initEvents(vm)    // vm的事件监听初始化
    initRender(vm)  //render
    callHook(vm, 'beforeCreate')
    initState(vm)//vm的状态初始化，prop/data/computed/method/watch都在这里完成初始化，因此也是Vue实例create的关键
    callHook(vm, 'created')
    if (vm.$options.el) {
      // mount  如果在options中提供了el，那么就需要把组件挂接到el上，如果没有提供el，那么就要后期自己去调用vm.$mount了。
      vm.$mount(vm.$options.el)
    }
  }
}

function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  opts.parent = options.parent
  opts.propsData = options.propsData
  opts._parentVnode = options._parentVnode
  opts._parentListeners = options._parentListeners
  opts._renderChildren = options._renderChildren
  opts._componentTag = options._componentTag
  opts._parentElm = options._parentElm
  opts._refElm = options._refElm
  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

//处理构造器中得options，日常中的业务逻辑基本都分散在options里面的各个子对象里面了
export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = Ctor.super.options // Ctor parent的optoions
    const cachedSuperOptions = Ctor.superOptions
    const extendOptions = Ctor.extendOptions// Ctor本身的optoions
    // 这里对superOptions做了cache,如果没有变化，就不用merge生成Ctor.options
    if (superOptions !== cachedSuperOptions) {
      // super option changed
      Ctor.superOptions = superOptions
      extendOptions.render = options.render
      extendOptions.staticRenderFns = options.staticRenderFns
      extendOptions._scopeId = options._scopeId
      options = Ctor.options = mergeOptions(superOptions, extendOptions)
      if (options.name) {// 方便调试，建议开发时加上name属性
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}
