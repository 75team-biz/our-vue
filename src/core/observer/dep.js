/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * Dep类是一个简单的观察者模式的实现。
 */
export default class Dep {
  static target: ?Watcher; //表示当前正在计算的Watcher，它是全局唯一的，因为在同一时间只能有一个Watcher被计算。
  id: number;
  subs: Array<Watcher>;  //subs用来存储所有订阅它的Watcher

  constructor () {
    this.id = uid++
    this.subs = []
  }

  addSub (sub: Watcher) { //添加订阅者
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {   //删除订阅者
    remove(this.subs, sub)
  }

  depend () {  //把当前Dep的实例添加到当前正在计算的Watcher的依赖中。
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stablize the subscriber list first
    const subs = this.subs.slice()
    //遍历了所有的订阅Watcher，调用它们的update方法
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
Dep.target = null
const targetStack = []

export function pushTarget (_target: Watcher) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

export function popTarget () {
  Dep.target = targetStack.pop()
}
