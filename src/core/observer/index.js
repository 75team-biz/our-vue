/* @flow */

import Dep from './dep'
import { arrayMethods } from './array'
import {
  def,
  isObject,
  isPlainObject,
  hasProto,
  hasOwn,
  warn,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However when passing down props,
 * we don't want to force conversion because the value may be a nested value
 * under a frozen data structure. Converting it would defeat the optimization.
 */
export const observerState = {
  shouldConvert: true,
  isSettingProps: false
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that has this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()  //创建了一个Dep对象实例 观察者模式中 Dep 是主题实例
    this.vmCount = 0
    def(value, '__ob__', this)  //把自身this添加到value的ob属性上
    if (Array.isArray(value)) { //对value的类型进行判断
      const augment = hasProto
        ? protoAugment
        : copyAugment
      augment(value, arrayMethods, arrayKeys)
      this.observeArray(value) //如果是数组则观察数组
    } else {
      this.walk(value) //否则观察单个元素。
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   * 对obj的key进行遍历，依次调用convert方法，
   * 对obj的每一个属性进行转换，让它们拥有getter、setter方法。
   * 只有当obj是一个对象时，这个方法才能被调用。
   */
  walk (obj: Object) { //最终都会调用walk方法观察单个元素
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) { //observeArray方法就是对数组进行遍历，递归调用observe方法
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 * augment: 增强
 * 通过使用 __proto__ 拦截原型链来增强目标对象或数组
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 * 通过定义隐藏变量增强目标对象或数组
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 * 返回一个 Observer 对象
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value)) {//如果不是对象和数组则返回
    return
  }
  let ob: Observer | void
  //判断value是否已经添加了ob属性，它是一个Observer对象的实例。
  // 已经是一个监控对象了,返会observer
  // 一个监控对象的标志就是含有属性'__ob__'，并且属性值是Observer的实例
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    //如果是就直接用
    ob = value.__ob__
  } else if (
    observerState.shouldConvert && //只有 root instance props 需要创建 Observer 对象
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    //否则在value满足一些条件（数组或对象、可扩展、非vue组件等）的情况下创建一个Observer对象。
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob // 返回一个 Observer 对象
}

/**
 * Define a reactive property on an Object.
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: Function
) {
  //实例一个依赖收集容器Dep,这里会记录改属性值的所有依赖，在get属性值时进行依赖收集，在set属性值时通知依赖更新；
  const dep = new Dep()  //每个对象又会有一个 dep 实例，用来保存依赖（订阅）的watcher

  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) { //如果不可修改，则返回
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set

//调用observe(val)，如果属性值为数组或者对象，那么会被转换为监控数组或监控对象，如果是基本值，则直接进入下一步。
  let childOb = observe(val)
  // 最核心的部分就是通过调用Object.defineProperty给data的每个属性添加getter和setter方法。
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        //如果存在Dep.target，表示是在新建Watcher的时候调用的
        // 这个 Dep 是个全局变量，代码已经保证 target只在新建watcher 的时候有值
        dep.depend()// 依赖收集
      // 如果是监控数组或监控对象，则相应observer也要收集这个依赖
      // 这样做的目的是我们可能会想给监控对象添加属性，这个时候我们需要调用vue提供的set方法，对添加的属性添加监控，并通知依赖更新
        if (childOb) { //如果存在子元素对象
          childOb.dep.depend() // 处理好依赖watcher
        }
      // 如果是数组，进一步处理
        if (Array.isArray(value)) {
          dependArray(value)
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return  // 如果set值与原来的值一样，则直接返回
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 如果新的值是数组或对象，则需要转换为监控数组和监控对象
      // 在 observe 函数第一句会判断新值是否是对象或者数组
      childOb = observe(newVal)    // 对新数据重新observe
      dep.notify()   // 通知到dep进行数据更新
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (obj: Array<any> | Object, key: any, val: any) {
  if (Array.isArray(obj)) {
    obj.length = Math.max(obj.length, key)
    obj.splice(key, 1, val)
    return val
  }
  if (hasOwn(obj, key)) {
    obj[key] = val
    return
  }
  const ob = obj.__ob__
  if (obj._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return
  }
  if (!ob) {
    obj[key] = val
    return
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (obj: Object, key: string) {
  const ob = obj.__ob__
  if (obj._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(obj, key)) {
    return
  }
  delete obj[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
