/* @flow */

import Watcher from '../observer/watcher'
import Dep from '../observer/dep'

import {
  set,
  del,
  observe,
  defineReactive,
  observerState
} from '../observer/index'

import {
  warn,
  hasOwn,
  isReserved,
  isPlainObject,
  bind,
  validateProp,
  noop
} from '../util/index'

export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  if (opts.props) initProps(vm, opts.props)// 初始化props
  if (opts.methods) initMethods(vm, opts.methods)// 初始化Methods
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  if (opts.computed) initComputed(vm, opts.computed)
  if (opts.watch) initWatch(vm, opts.watch)
}

const isReservedProp = { key: 1, ref: 1, slot: 1 }

function initProps (vm: Component, props: Object) {
  const propsData = vm.$options.propsData || {}
  const keys = vm.$options._propKeys = Object.keys(props)
  const isRoot = !vm.$parent
  // root instance props should be converted
  // 这里用来标志是否将要propsData的value转换为监控对象,因为propsData可能指向其它对象，
  // 也许不能够被监控，因而除了propsData默认的value可以被监控，其它用户传入的值都不可信，因此也就不转换
    observerState.shouldConvert = isRoot
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      if (isReservedProp[key]) {
        warn(
          `"${key}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      // 监控prop的改变
      defineReactive(vm, key, validateProp(key, props, propsData, vm), () => {
        if (vm.$parent && !observerState.isSettingProps) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      defineReactive(vm, key, validateProp(key, props, propsData, vm))
    }
  }
  // 还原observerState.shouldConvert
  observerState.shouldConvert = true
}

function initData (vm: Component) {
  let data = vm.$options.data
  data = vm._data = typeof data === 'function'
    ? data.call(vm)
    : data || {}
  if (!isPlainObject(data)) {// 保证data必须为纯对象
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  const keys = Object.keys(data)
  const props = vm.$options.props
  let i = keys.length
  while (i--) {
    if (props && hasOwn(props, keys[i])) {// 是props，则不代理
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${keys[i]}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else {// 将属性代理的vm上， 可以通过vm.xx访问到vm._data.xx
      proxy(vm, keys[i]) //proxy方法，功能就是遍历data的key，把data上的属性代理到vm实例上。
    }
  }
  // observe data
  observe(data, true /* asRootData */)  //observe(data, this)方法来对data做监听
}

const computedSharedDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}


//computed其实本身也是一种特殊的并且lazy的watcher,在get时它作为所计算的属性依赖而被收集，
//同时它把依赖自己的watcher也添加到属性的依赖中去，这样当原属性变化时，
//就会通知到依赖computed的依赖重新获取最新值。
function initComputed (vm: Component, computed: Object) {
  for (const key in computed) {
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && key in vm) {
      warn(
        `existing instance property "${key}" will be ` +
        `overwritten by a computed property with the same name.`,
        vm
      )
    }
    const userDef = computed[key]
    if (typeof userDef === 'function') {
      computedSharedDefinition.get = makeComputedGetter(userDef, vm)
      computedSharedDefinition.set = noop
    } else {
      computedSharedDefinition.get = userDef.get
        ? userDef.cache !== false
          ? makeComputedGetter(userDef.get, vm)
          : bind(userDef.get, vm)
        : noop
      computedSharedDefinition.set = userDef.set
        ? bind(userDef.set, vm)
        : noop
    }
    Object.defineProperty(vm, key, computedSharedDefinition)
  }
}

function makeComputedGetter (getter: Function, owner: Component): Function {
  const watcher = new Watcher(owner, getter, noop, {
    lazy: true
  })
  return function computedGetter () {
    if (watcher.dirty) {
      watcher.evaluate()// 将自己添加到属性的依赖列表中去
    }
    if (Dep.target) {
      watcher.depend()// 将依赖watcher的依赖也收集到属性的依赖列表中去
    }
    return watcher.value
  }
}

//methods的初始化比较简单，就是作用域的重新绑定。
function initMethods (vm: Component, methods: Object) {
  for (const key in methods) {
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm)//将this绑定到vm
    if (process.env.NODE_ENV !== 'production' && methods[key] == null) {
      warn(
        `method "${key}" has an undefined value in the component definition. ` +
        `Did you reference the function correctly?`,
        vm
      )
    }
  }
}

function initWatch (vm: Component, watch: Object) {
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {// 可以是数组，为key创建多个watcher
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
    //对于watcher,必须是一个对象，key是你想要监听的属性，value是属性变化时执行回调，value可以是数组，一次执行多个回调。
  }
}

function createWatcher (vm: Component, key: string, handler: any) {
  let options
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  // 如果handle传入为字符串，则直接找vm上的方法，一般是methods中定义的方法，这也是methods的初始化要先于watch初始化的原因
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  vm.$watch(key, handler, options)//走入原型方法$watch中
}

export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () {
    return this._data
  }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function (newData: Object) {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef)

  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: Function,
    options?: Object
  ): Function {
    const vm: Component = this
    options = options || {}
    options.user = true
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      cb.call(vm, watcher.value)
    }
    return function unwatchFn () {
      watcher.teardown()// 最后返回的是unwatch函数，用于在你不需要的时候销毁watcher
    }
  }
}

function proxy (vm: Component, key: string) {  //proxy方法，功能就是遍历data的key，把data上的属性代理到vm实例上。
  if (!isReserved(key)) {
    Object.defineProperty(vm, key, {
      configurable: true,
      enumerable: true,
      get: function proxyGetter () {
        return vm._data[key]
      },
      set: function proxySetter (val) {
        vm._data[key] = val
      }
    })
  }
}
